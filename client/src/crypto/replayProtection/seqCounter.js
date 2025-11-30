/**
 * Manages message sequence counters.
 */

let counter = 0;

export const getNextSequence = () => {
  counter++;
  return counter;
};

export const validateSequence = (receivedSeq) => {
  // TODO: Track last seen sequence numbers
  return true;
};
