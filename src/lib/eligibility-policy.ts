import type {Requirement} from './schemas';
import type {EligibilitySuggestion} from './ai/contracts';
// Numeric and certification checks still require their structured company facts.
export function supportsQualitativeRequirement(requirement:Requirement,ai:Pick<EligibilitySuggestion,'suggestion'|'evidenceIds'>|null|undefined){
 return requirement.confirmed&&['manual','experience','location'].includes(requirement.type)&&ai?.suggestion==='supporting evidence'&&ai.evidenceIds.length>0;
}
