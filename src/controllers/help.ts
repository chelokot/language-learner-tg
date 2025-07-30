import { Composer } from 'grammy';
import type { CustomContext } from '../types/context.js';

export const helpController = new Composer<CustomContext>();
helpController.command('help', ctx => ctx.text('help'));
