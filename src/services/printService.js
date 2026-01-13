// Print service wrapper
import { printStrips } from '../utils/printUtils';

export const printService = {
  /**
   * Print strips using the print utilities
   */
  print(strips, poolSize = 4, cutGuides = true) {
    printStrips(strips, poolSize, cutGuides);
  }
};
