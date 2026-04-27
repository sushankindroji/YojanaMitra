"""Explainable eligibility reasoning engine.

Core research contribution: Deterministic, template-based explanations
for welfare scheme eligibility decisions. Zero LLM calls.

Supports: English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional


# Translation dictionaries for all supported languages
_TRANSLATIONS = {
    "en": {
        "verdict_eligible": "You qualify for {scheme_name} based on {count} matching criteria.",
        "verdict_not_eligible": "You do not qualify for {scheme_name} because {reason}.",
        "verdict_partial": "You may qualify for {scheme_name} if {condition}.",
        "step_pass": "Step {num}: {field} check → {detail} ✓",
        "step_fail": "Step {num}: {field} check → {detail} ✗",
        "step_unknown": "Step {num}: {field} check → {detail} (data missing)",
        "improvement_one_failed": "You meet all other criteria. This scheme requires {field}={required}.",
        "improvement_two_failed": "To become eligible, you need: {condition1} AND {condition2}.",
        "improvement_many_failed": "This scheme may not be suitable for your profile.",
        "priority_high": "This scheme is HIGH priority for you because it provides ₹{benefit} benefit and you meet {matched}/{total} eligibility criteria.",
        "priority_medium": "This scheme is MEDIUM priority. You meet {matched}/{total} criteria. Review the requirements to improve eligibility.",
        "priority_low": "This scheme is LOW priority for your profile. Consider other schemes with better alignment.",
    },
    "hi": {
        "verdict_eligible": "आप {scheme_name} के लिए {count} मेल खाने वाले मानदंडों के आधार पर योग्य हैं।",
        "verdict_not_eligible": "आप {scheme_name} के लिए योग्य नहीं हैं क्योंकि {reason}।",
        "verdict_partial": "यदि {condition} तो आप {scheme_name} के लिए योग्य हो सकते हैं।",
        "step_pass": "चरण {num}: {field} जांच → {detail} ✓",
        "step_fail": "चरण {num}: {field} जांच → {detail} ✗",
        "step_unknown": "चरण {num}: {field} जांच → {detail} (डेटा अनुपलब्ध)",
        "improvement_one_failed": "आप अन्य सभी मानदंडों को पूरा करते हैं। इस योजना के लिए {field}={required} आवश्यक है।",
        "improvement_two_failed": "योग्य होने के लिए, आपको चाहिए: {condition1} और {condition2}।",
        "improvement_many_failed": "यह योजना आपकी प्रोफाइल के लिए उपयुक्त नहीं हो सकती है।",
        "priority_high": "यह योजना आपके लिए उच्च प्राथमिकता है क्योंकि यह ₹{benefit} लाभ प्रदान करता है और आप {matched}/{total} पात्रता मानदंड पूरे करते हैं।",
        "priority_medium": "यह योजना मध्यम प्राथमिकता है। आप {matched}/{total} मानदंड पूरे करते हैं। पात्रता में सुधार के लिए आवश्यकताओं की समीक्षा करें।",
        "priority_low": "यह योजना आपकी प्रोफाइल के लिए कम प्राथमिकता है। बेहतर संरेखण वाली अन्य योजनाओं पर विचार करें।",
    },
    "te": {
        "verdict_eligible": "మీరు {count} సరిపోలిన ప్రమాణాల ఆధారంగా {scheme_name} కోసం అర్హులు.",
        "verdict_not_eligible": "{reason} కారణంగా మీరు {scheme_name} కోసం అర్హులు కాదు.",
        "verdict_partial": "{condition} అయితే మీరు {scheme_name} కోసం అర్హులు కావచ్చు.",
        "step_pass": "దశ {num}: {field} తనిఖీ → {detail} ✓",
        "step_fail": "దశ {num}: {field} తనిఖీ → {detail} ✗",
        "step_unknown": "దశ {num}: {field} తనిఖీ → {detail} (డేటా లేదు)",
        "improvement_one_failed": "మీరు ఇతర అన్ని ప్రమాణాలను సంతృప్తి చేస్తారు. ఈ పథకానికి {field}={required} అవసరం.",
        "improvement_two_failed": "అర్హులు కావడానికి, మీకు చాలాలి: {condition1} మరియు {condition2}.",
        "improvement_many_failed": "ఈ పథకం మీ ప్రొఫైల్‌కు సరిపోకపోవచ్చు.",
        "priority_high": "ఈ పథకం మీకు అధిక ప్రాధాన్యత ఎందుకంటే ఇది ₹{benefit} ప్రయోజనం ఇస్తుంది మరియు మీరు {matched}/{total} అర్హతా ప్రమాణాలను సంతృప్తి చేస్తారు.",
        "priority_medium": "ఈ పథకం మధ్యస్థ ప్రాధాన్యత. మీరు {matched}/{total} ప్రమాణాలను సంతృప్తి చేస్తారు. అర్హతను మెరుగుపరచడానికి అవసరాలను సమీక్షించండి.",
        "priority_low": "ఈ పథకం మీ ప్రొఫైల్‌కు తక్కువ ప్రాధాన్యత. మెరుగైన సమన్వయం ఉన్న ఇతర పథకాలను పరిగణించండి.",
    },
    "ta": {
        "verdict_eligible": "நீங்கள் {count} பொருந்தக்கூடிய அளவுகோல்களின் அடிப்படையில் {scheme_name} க்கு தகுதியுள்ளவர்.",
        "verdict_not_eligible": "{reason} காரணத்தால் நீங்கள் {scheme_name} க்கு தகுதியுள்ளவர் அல்ல.",
        "verdict_partial": "{condition} என்றால் நீங்கள் {scheme_name} க்கு தகுதியுள்ளவர் இருக்கலாம்.",
        "step_pass": "படி {num}: {field} சரிபார்ப்பு → {detail} ✓",
        "step_fail": "படி {num}: {field} சரிபார்ப்பு → {detail} ✗",
        "step_unknown": "படி {num}: {field} சரிபார்ப்பு → {detail} (தரவு இல்லை)",
        "improvement_one_failed": "நீங்கள் மற்ற அனைத்து அளவுகோல்களையும் பூர்த்தி செய்கிறீர்கள். இந்த திட்டத்திற்கு {field}={required} தேவை.",
        "improvement_two_failed": "தகுதியுள்ளவர் ஆக, உங்களுக்கு தேவை: {condition1} மற்றும் {condition2}.",
        "improvement_many_failed": "இந்த திட்டம் உங்கள் சுயவிவரத்திற்கு பொருத்தமாக இருக்காது.",
        "priority_high": "இந்த திட்டம் உங்களுக்கு உচ்च முன்னுரிமை ஏனெனில் இது ₹{benefit} நன்மை வழங்குகிறது மற்றும் நீங்கள் {matched}/{total} தகுதி அளவுகோல்களை பூர்த்தி செய்கிறீர்கள்.",
        "priority_medium": "இந்த திட்டம் நடுத்தர முன்னுரிமை. நீங்கள் {matched}/{total} அளவுகோல்களை பூர்த்தி செய்கிறீர்கள். தகுதியை மேம்படுத்த தேவைகளை மதிப்பாய்வு செய்யவும்.",
        "priority_low": "இந்த திட்டம் உங்கள் சுயவிவரத்திற்கு குறைந்த முன்னுரிமை. சிறந்த சீரமைப்பு கொண்ட பிற திட்டங்களைக் கவனியுங்கள்.",
    },
    "kn": {
        "verdict_eligible": "ನೀವು {count} ಹೊಂದಾಣಿಕೆಯ ಮಾನದಂಡಗಳ ಆಧಾರದ ಮೇಲೆ {scheme_name} ಗೆ ಅರ್ಹರು.",
        "verdict_not_eligible": "{reason} ಕಾರಣದಿಂದ ನೀವು {scheme_name} ಗೆ ಅರ್ಹರು ಅಲ್ಲ.",
        "verdict_partial": "{condition} ಆದರೆ ನೀವು {scheme_name} ಗೆ ಅರ್ಹರಾಗಬಹುದು.",
        "step_pass": "ಹಂತ {num}: {field} ಪರಿಶೀಲನೆ → {detail} ✓",
        "step_fail": "ಹಂತ {num}: {field} ಪರಿಶೀಲನೆ → {detail} ✗",
        "step_unknown": "ಹಂತ {num}: {field} ಪರಿಶೀಲನೆ → {detail} (ಡೇಟಾ ಇಲ್ಲ)",
        "improvement_one_failed": "ನೀವು ಎಲ್ಲಾ ಇತರ ಮಾನದಂಡಗಳನ್ನು ಪೂರೈಸುತ್ತೀರಿ. ಈ ಯೋಜನೆಗೆ {field}={required} ಅಗತ್ಯವಿದೆ.",
        "improvement_two_failed": "ಅರ್ಹರಾಗಲು, ನಿಮಗೆ ಬೇಕು: {condition1} ಮತ್ತು {condition2}.",
        "improvement_many_failed": "ಈ ಯೋಜನೆ ನಿಮ್ಮ ಪ್ರೊಫೈಲ್‌ಗೆ ಸೂಕ್ತವಾಗಿರುವುದಿಲ್ಲ.",
        "priority_high": "ಈ ಯೋಜನೆ ನಿಮಗೆ ಹೆಚ್ಚಿನ ಆದ್ಯತೆ ಏಕೆಂದರೆ ಇದು ₹{benefit} ಪ್ರಯೋಜನ ನೀಡುತ್ತದೆ ಮತ್ತು ನೀವು {matched}/{total} ಅರ್ಹತೆ ಮಾನದಂಡಗಳನ್ನು ಪೂರೈಸುತ್ತೀರಿ.",
        "priority_medium": "ಈ ಯೋಜನೆ ಮಧ್ಯಮ ಆದ್ಯತೆ. ನೀವು {matched}/{total} ಮಾನದಂಡಗಳನ್ನು ಪೂರೈಸುತ್ತೀರಿ. ಅರ್ಹತೆ ಸುಧಾರಿಸಲು ಅವಶ್ಯಕತೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
        "priority_low": "ಈ ಯೋಜನೆ ನಿಮ್ಮ ಪ್ರೊಫೈಲ್‌ಗೆ ಕಡಿಮೆ ಆದ್ಯತೆ. ಉತ್ತಮ ಜೋಡಣೆ ಹೊಂದಿರುವ ಇತರ ಯೋಜನೆಗಳನ್ನು ಪರಿಗಣಿಸಿ.",
    },
    "mr": {
        "verdict_eligible": "आप {count} जुळणार्‍या निकषांच्या आधारे {scheme_name} साठी पात्र आहात.",
        "verdict_not_eligible": "{reason} कारणामुळे आप {scheme_name} साठी पात्र नाहीत.",
        "verdict_partial": "{condition} असल्यास आप {scheme_name} साठी पात्र असू शकता.",
        "step_pass": "पायरी {num}: {field} तपासणी → {detail} ✓",
        "step_fail": "पायरी {num}: {field} तपासणी → {detail} ✗",
        "step_unknown": "पायरी {num}: {field} तपासणी → {detail} (डेटा नाही)",
        "improvement_one_failed": "आप इतर सर्व निकष पूर्ण करता. या योजनेसाठी {field}={required} आवश्यक आहे.",
        "improvement_two_failed": "पात्र होण्यासाठी, आपल्याला हवे: {condition1} आणि {condition2}.",
        "improvement_many_failed": "ही योजना आपल्या प्रोफाइलसाठी उपयुक्त नाही.",
        "priority_high": "ही योजना आपल्यासाठी उच्च प्राधान्य आहे कारण ती ₹{benefit} लाभ प्रदान करते आणि आप {matched}/{total} पात्रता निकष पूर्ण करता.",
        "priority_medium": "ही योजना मध्यम प्राधान्य आहे. आप {matched}/{total} निकष पूर्ण करता. पात्रता सुधारण्यासाठी आवश्यकता पुनरावलोकन करा.",
        "priority_low": "ही योजना आपल्या प्रोफाइलसाठी कमी प्राधान्य आहे. चांगल्या संरेखणासह इतर योजना विचारात घ्या.",
    },
    "bn": {
        "verdict_eligible": "আপনি {count}টি মেলে এমন মানদণ্ডের ভিত্তিতে {scheme_name} এর জন্য যোগ্য।",
        "verdict_not_eligible": "{reason} কারণে আপনি {scheme_name} এর জন্য যোগ্য নন।",
        "verdict_partial": "{condition} হলে আপনি {scheme_name} এর জন্য যোগ্য হতে পারেন।",
        "step_pass": "ধাপ {num}: {field} পরীক্ষা → {detail} ✓",
        "step_fail": "ধাপ {num}: {field} পরীক্ষা → {detail} ✗",
        "step_unknown": "ধাপ {num}: {field} পরীক্ষা → {detail} (ডেটা নেই)",
        "improvement_one_failed": "আপনি অন্যান্য সমস্ত মানদণ্ড পূরণ করেন। এই স্কিমের জন্য {field}={required} প্রয়োজন।",
        "improvement_two_failed": "যোগ্য হতে, আপনার প্রয়োজন: {condition1} এবং {condition2}।",
        "improvement_many_failed": "এই স্কিমটি আপনার প্রোফাইলের জন্য উপযুক্ত নাও হতে পারে।",
        "priority_high": "এই স্কিমটি আপনার জন্য উচ্চ অগ্রাধিকার কারণ এটি ₹{benefit} সুবিধা প্রদান করে এবং আপনি {matched}/{total} যোগ্যতার মানদণ্ড পূরণ করেন।",
        "priority_medium": "এই স্কিমটি মধ্যম অগ্রাধিকার। আপনি {matched}/{total} মানদণ্ড পূরণ করেন। যোগ্যতা উন্নত করতে প্রয়োজনীয়তা পর্যালোচনা করুন।",
        "priority_low": "এই স্কিমটি আপনার প্রোফাইলের জন্য কম অগ্রাধিকার। আরও ভাল সারিবদ্ধতা সহ অন্যান্য স্কিম বিবেচনা করুন।",
    },
}


def _get_text(key: str, language: str, **kwargs) -> str:
    """Get translated text with variable substitution."""
    lang_dict = _TRANSLATIONS.get(language, _TRANSLATIONS["en"])
    template = lang_dict.get(key, _TRANSLATIONS["en"].get(key, ""))
    try:
        return template.format(**kwargs)
    except KeyError:
        return template


def _priority_from_score(confidence_score: int) -> str:
    """Determine priority level from confidence score."""
    if confidence_score > 80:
        return "high"
    if confidence_score > 50:
        return "medium"
    return "low"


def _build_reasoning_chain(
    passed_checks: List[Dict[str, Any]],
    failed_checks: List[Dict[str, Any]],
    unknown_checks: List[Dict[str, Any]],
    language: str = "en",
) -> List[str]:
    """Build ordered reasoning steps."""
    chain: List[str] = []
    step_num = 1
    
    # Passed checks
    for check in passed_checks:
        field = check.get("field", "Unknown")
        message = check.get("message", "Condition met")
        chain.append(_get_text("step_pass", language, num=step_num, field=field, detail=message))
        step_num += 1
    
    # Failed checks
    for check in failed_checks:
        field = check.get("field", "Unknown")
        message = check.get("message", "Condition not met")
        chain.append(_get_text("step_fail", language, num=step_num, field=field, detail=message))
        step_num += 1
    
    # Unknown checks
    for check in unknown_checks:
        field = check.get("field", "Unknown")
        message = check.get("message", "Data missing")
        chain.append(_get_text("step_unknown", language, num=step_num, field=field, detail=message))
        step_num += 1
    
    return chain


def _build_improvement_suggestion(
    failed_checks: List[Dict[str, Any]],
    language: str = "en",
) -> str:
    """Build improvement suggestion based on failed checks."""
    if not failed_checks:
        return ""
    
    if len(failed_checks) == 1:
        check = failed_checks[0]
        field = check.get("field", "requirement")
        required = check.get("required", "specific value")
        return _get_text("improvement_one_failed", language, field=field, required=required)
    
    if len(failed_checks) == 2:
        condition1 = failed_checks[0].get("message", "first condition")
        condition2 = failed_checks[1].get("message", "second condition")
        return _get_text("improvement_two_failed", language, condition1=condition1, condition2=condition2)
    
    return _get_text("improvement_many_failed", language)


def _build_verdict(
    scheme_name: str,
    eligible: bool,
    confidence_score: int,
    failed_checks: List[Dict[str, Any]],
    passed_checks: List[Dict[str, Any]],
    language: str = "en",
) -> str:
    """Build verdict statement."""
    if eligible:
        return _get_text("verdict_eligible", language, scheme_name=scheme_name, count=len(passed_checks))
    
    if confidence_score > 0 and failed_checks:
        # Partial eligibility
        if len(failed_checks) == 1:
            condition = failed_checks[0].get("message", "a condition")
            return _get_text("verdict_partial", language, scheme_name=scheme_name, condition=condition)
        else:
            condition = f"{len(failed_checks)} conditions"
            return _get_text("verdict_partial", language, scheme_name=scheme_name, condition=condition)
    
    # Not eligible
    reason = failed_checks[0].get("message", "eligibility criteria not met") if failed_checks else "no matching criteria"
    return _get_text("verdict_not_eligible", language, scheme_name=scheme_name, reason=reason)


def _build_priority_explanation(
    priority: str,
    confidence_score: int,
    passed_checks: List[Dict[str, Any]],
    failed_checks: List[Dict[str, Any]],
    benefit_amount: Optional[float] = None,
    language: str = "en",
) -> str:
    """Build priority explanation."""
    total = len(passed_checks) + len(failed_checks)
    matched = len(passed_checks)
    
    if priority == "high":
        benefit_str = f"₹{int(benefit_amount)}" if benefit_amount else "significant"
        return _get_text("priority_high", language, benefit=benefit_str, matched=matched, total=total)
    
    if priority == "medium":
        return _get_text("priority_medium", language, matched=matched, total=total)
    
    return _get_text("priority_low", language)


class ExplainabilityEngine:
    """Generates deterministic, template-based explanations for eligibility decisions."""

    def generate_explanation(
        self,
        scheme_name: str,
        profile: dict,
        engine_result: dict,
        language: str = "en",
        benefit_amount: Optional[float] = None,
    ) -> dict:
        """
        Generate comprehensive explanation for eligibility decision.

        Args:
            scheme_name: Name of the scheme
            profile: User profile dict
            engine_result: Output from eligibility_engine.check_eligibility()
            language: Language code (en, hi, te, ta, kn, mr, bn)
            benefit_amount: Scheme benefit amount (optional)

        Returns:
            {
                "verdict": str,
                "reasoning_chain": [str],
                "improvement_suggestion": str,
                "priority": "high/medium/low",
                "priority_explanation": str,
                "language": str,
            }
        """
        # Validate language
        if language not in _TRANSLATIONS:
            language = "en"

        eligible = engine_result.get("eligible", False)
        confidence_score = engine_result.get("confidence_score", 0)
        passed_checks = engine_result.get("passed_checks", [])
        failed_checks = engine_result.get("failed_checks", [])
        unknown_checks = engine_result.get("unknown_conditions", [])

        # Build components
        verdict = _build_verdict(
            scheme_name,
            eligible,
            confidence_score,
            failed_checks,
            passed_checks,
            language,
        )

        reasoning_chain = _build_reasoning_chain(
            passed_checks,
            failed_checks,
            unknown_checks,
            language,
        )

        improvement_suggestion = _build_improvement_suggestion(failed_checks, language)

        priority = _priority_from_score(confidence_score)

        priority_explanation = _build_priority_explanation(
            priority,
            confidence_score,
            passed_checks,
            failed_checks,
            benefit_amount,
            language,
        )

        return {
            "verdict": verdict,
            "reasoning_chain": reasoning_chain,
            "improvement_suggestion": improvement_suggestion,
            "priority": priority,
            "priority_explanation": priority_explanation,
            "language": language,
        }
