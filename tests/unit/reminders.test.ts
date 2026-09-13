import {it,expect} from 'vitest';
import {dueLead,reminderDays} from '../../src/lib/monitor';
it('selects one urgent reminder instead of sending every missed threshold',()=>{expect(dueLead(1,[7,3,1])).toBe(1);expect(dueLead(3,[7,3,1])).toBe(3);expect(dueLead(8,[7,3,1])).toBeUndefined();expect(dueLead(-1,[7,3,1])).toBe(-1);expect(dueLead(0,[])).toBeUndefined();});
it('calculates reminder days consistently in India',()=>{expect(reminderDays('2026-09-14T00:30:00+05:30',new Date('2026-09-13T20:00:00Z'))).toBe(0);});
