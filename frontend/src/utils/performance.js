export const adjectivalDisplayName = {
  OUTSTANDING: 'Outstanding',
  VERY_SATISFACTORY: 'Very Satisfactory',
  SATISFACTORY: 'Satisfactory',
  UNSATISFACTORY: 'Unsatisfactory',
  POOR: 'Poor',
};

export function incentiveFlags(adjectival) {
  return {
    pbb: ['OUTSTANDING', 'VERY_SATISFACTORY', 'SATISFACTORY'].includes(adjectival),
    promotion: ['OUTSTANDING', 'VERY_SATISFACTORY'].includes(adjectival),
    stepIncrement: adjectival === 'OUTSTANDING' ? '2_STEPS' :
                   adjectival === 'VERY_SATISFACTORY' ? '1_STEP' : 'NONE',
  };
}
