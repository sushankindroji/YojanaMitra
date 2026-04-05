"""
Eligibility Matching Service
Matches user profiles against scheme eligibility criteria across 4500+ schemes
"""

import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Profile, Scheme, EligibilityResult, User


class EligibilityMatcher:
    """Core engine for matching user profiles to scheme eligibility"""
    
    def __init__(self, db: Session):
        self.db = db
        self.min_score_threshold = 0.3  # 30% minimum match for consideration
    
    def check_user_eligibility(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Check user eligibility against all 4500+ schemes.
        Returns sorted list of eligible schemes with match scores.
        """
        # Get user profile
        profile = self.db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile:
            return []
        
        # Get all schemes
        schemes = self.db.query(Scheme).filter(Scheme.is_active == 1).all()
        
        # Check eligibility for each scheme
        eligible_schemes = []
        for scheme in schemes:
            score = self._calculate_eligibility_score(profile, scheme)
            
            # Include all schemes with any score above 0
            if score > 0:
                result = {
                    'scheme_id': scheme.id,
                    'scheme_code': scheme.scheme_code,
                    'scheme_name': scheme.name_en,
                    'sector': scheme.sector,
                    'state': scheme.state,
                    'eligibility_score': round(score, 2),
                    'is_eligible': 1 if score >= 0.8 else 0,
                    'description': scheme.description_en,
                    'benefit_type': scheme.benefit_type
                }
                eligible_schemes.append(result)
        
        # Sort by score (descending)
        eligible_schemes.sort(key=lambda x: x['eligibility_score'], reverse=True)
        
        return eligible_schemes
    
    def _calculate_eligibility_score(self, profile: Profile, scheme: Scheme) -> float:
        """
        Calculate eligibility score (0-1) for a profile-scheme pair.
        Uses rule-based matching on profile attributes.
        """
        score = 0.0
        max_score = 0.0
        
        # Rule 1: State Match (20 points)
        if scheme.state == 'Central' or scheme.state == profile.state:
            score += 20
        max_score += 20
        
        # Rule 2: Sector Match - Check profile characteristics
        sector_lower = scheme.sector.lower()
        
        # Agriculture schemes
        if 'agri' in sector_lower and profile.is_farmer:
            score += 25
        max_score += 25 if 'agri' in sector_lower else 0
        
        # Healthcare schemes
        if 'health' in sector_lower:
            score += 15
        max_score += 15
        
        # Education schemes
        if 'education' in sector_lower or 'scholarship' in sector_lower:
            if profile.is_student:
                score += 25
            else:
                score += 10
        max_score += 25
        
        # Employment/Skill schemes
        if 'employ' in sector_lower or 'skill' in sector_lower:
            if not profile.is_farmer and not profile.is_student:
                score += 20
            else:
                score += 10
        max_score += 20
        
        # Social Security & Women Welfare
        if 'women' in sector_lower or 'widow' in sector_lower:
            if profile.is_woman_headed:
                score += 25
            elif profile.gender == 'female':
                score += 20
            else:
                score += 5
        max_score += 25
        
        if 'social security' in sector_lower or 'pension' in sector_lower:
            if profile.is_senior_citizen:
                score += 25
            else:
                score += 10
        max_score += 25
        
        # Rule 3: Income-based schemes
        if 'bpl' in sector_lower.lower() or 'poor' in sector_lower:
            if profile.is_bpl:
                score += 20
            elif profile.annual_income and profile.annual_income < 100000:
                score += 15
            else:
                score += 0
        max_score += 20
        
        # Rule 4: Social Category benefits
        if 'sc/st' in sector_lower or 'scheduled' in sector_lower:
            if profile.social_category in ['sc', 'st']:
                score += 25
            else:
                score += 5
        max_score += 25
        
        # Rule 5: Minority schemes
        if 'minority' in sector_lower:
            if profile.is_minority:
                score += 20
            else:
                score += 5
        max_score += 20
        
        # Rule 6: Disability schemes
        if 'disability' in sector_lower or 'disabled' in sector_lower:
            if profile.has_disability:
                score += 25
            else:
                score += 0
        max_score += 25
        
        # Rule 7: Housing schemes
        if 'housing' in sector_lower or 'awas' in sector_lower:
            score += 15
        max_score += 15
        
        # Rule 8: Rural only schemes
        if 'rural' in sector_lower:
            # Assume non-urban if not specified
            score += 15
        max_score += 15
        
        # Rule 9: Gender-specific
        if 'women' in sector_lower or 'girl' in sector_lower:
            if profile.gender == 'female':
                score += 10
            else:
                score -= 5
        max_score += 10
        
        # Rule 10: Age-based
        if profile.age:
            if 'senior' in sector_lower or 'elderly' in sector_lower:
                if profile.age >= 60:
                    score += 25
                else:
                    score += 0
            if 'youth' in sector_lower or 'young' in sector_lower:
                if profile.age <= 35:
                    score += 20
                else:
                    score += 0
        
        # Normalize score to 0-1 range
        if max_score > 0:
            normalized_score = score / max_score
        else:
            normalized_score = 0.0
        
        return min(normalized_score, 1.0)
    
    def save_eligibility_results(self, user_id: str, results: List[Dict]) -> int:
        """
        Save eligibility results to database.
        Returns number of results saved.
        """
        saved = 0
        
        for result in results:
            # Check if result already exists
            existing = self.db.query(EligibilityResult).filter(
                EligibilityResult.user_id == user_id,
                EligibilityResult.scheme_id == result['scheme_id']
            ).first()
            
            if existing:
                # Update existing
                existing.is_eligible = result['is_eligible']
                existing.eligibility_score = result['eligibility_score']
                existing.computed_at = datetime.utcnow().isoformat()
            else:
                # Create new
                new_result = EligibilityResult(
                    user_id=user_id,
                    scheme_id=result['scheme_id'],
                    is_eligible=result['is_eligible'],
                    eligibility_score=result['eligibility_score'],
                    mandatory_pass=1 if result['eligibility_score'] >= 0.8 else 0,
                    explanation_en=f"Eligibility score: {result['eligibility_score']:.0%}"
                )
                self.db.add(new_result)
            
            saved += 1
        
        self.db.commit()
        return saved
    
    def get_top_eligible_schemes(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get top N eligible schemes for a user"""
        results = self.db.query(EligibilityResult).filter(
            EligibilityResult.user_id == user_id,
            EligibilityResult.is_eligible == 1
        ).order_by(
            EligibilityResult.eligibility_score.desc()
        ).limit(limit).all()
        
        return [
            {
                'scheme_id': r.scheme_id,
                'scheme': r.scheme.name_en,
                'sector': r.scheme.sector,
                'state': r.scheme.state,
                'score': r.eligibility_score,
                'benefit_type': r.scheme.benefit_type,
                'description': r.scheme.description_en
            }
            for r in results
        ]
    
    def get_eligibility_summary(self, user_id: str) -> Dict[str, Any]:
        """Get summary of user's eligibility across all schemes"""
        results = self.db.query(EligibilityResult).filter(
            EligibilityResult.user_id == user_id
        ).all()
        
        if not results:
            return {'total': 0, 'eligible': 0, 'partial': 0, 'not_eligible': 0}
        
        eligible = sum(1 for r in results if r.is_eligible)
        partial = sum(1 for r in results if r.is_partially_eligible)
        not_eligible = len(results) - eligible - partial
        
        avg_score = sum(r.eligibility_score or 0 for r in results) / len(results)
        
        return {
            'total_schemes_checked': len(results),
            'eligible_schemes': eligible,
            'partially_eligible': partial,
            'not_eligible': not_eligible,
            'average_eligibility_score': round(avg_score, 2),
            'top_sectors': self._get_top_sectors(results)
        }
    
    def _get_top_sectors(self, results: List[EligibilityResult]) -> List[Dict]:
        """Extract top sectors from eligibility results"""
        sector_counts = {}
        for r in results:
            if r.is_eligible:
                sector = r.scheme.sector
                sector_counts[sector] = sector_counts.get(sector, 0) + 1
        
        return sorted(
            [{'sector': s, 'count': c} for s, c in sector_counts.items()],
            key=lambda x: x['count'],
            reverse=True
        )[:5]


def get_eligibility_matcher(db: Session) -> EligibilityMatcher:
    """Dependency: Get eligibility matcher instance"""
    return EligibilityMatcher(db)
