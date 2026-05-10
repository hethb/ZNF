export function confidenceToLabel(confidence){if(confidence>=90)return 'High Confidence';if(confidence>=80)return 'Moderate Confidence';return 'Needs Review'}
export function shouldRequireReview(confidence,flags){if(confidence<80)return true;return (flags||[]).some((flag)=>flag.type==='Manual Review Recommended')}
