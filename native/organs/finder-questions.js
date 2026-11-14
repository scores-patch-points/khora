// finder-questions.js — ready shapes for the three identity questions. A convenience
// for whoever asks: the finder itself holds no list of questions. `by` names
// the asker.
export const allInformation = (by) => ({ asks: 'Do the two texts carry the same information, each stating all that the other states?', by, of: 'information', directions: 'both', grain: 'Ground' });
export const carries = (direction, by) => ({ asks: direction === 'a-carries-b' ? 'Does the first text state everything the second states?' : 'Does the second text state everything the first states?', by, of: 'information', directions: direction, grain: 'Ground' });
export const sameThing = (by) => ({ asks: 'Are the two texts about the same particular thing, whether or not they agree about it?', by, of: 'identity', grain: 'Figure' });
export const sameKind = (kind, by) => ({ asks: `Is each of the two texts ${kind}?`, by, of: 'kind', kind, grain: 'Pattern' });
