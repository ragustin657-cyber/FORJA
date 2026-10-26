import { afterEach, expect, test } from 'bun:test';
import { estaInstalada, mostrarAvisoInstalar, pedirPersistencia } from '../../../src/data/persistencia';

const g = globalThis as Record<string, unknown>;
const original = { navigator: g.navigator, matchMedia: g.matchMedia };
afterEach(() => {
  Object.defineProperty(globalThis, 'navigator', { value: original.navigator, configurable: true });
  g.matchMedia = original.matchMedia;
});
const fijarNavigator = (v: unknown) => Object.defineProperty(globalThis, 'navigator', { value: v, configurable: true });

test('pedirPersistencia devuelve false sin API', async () => {
  fijarNavigator({});
  expect(await pedirPersistencia()).toBe(false);
});

test('pedirPersistencia llama a storage.persist', async () => {
  let llamado = 0;
  fijarNavigator({ storage: { persist: async () => { llamado++; return true; } } });
  expect(await pedirPersistencia()).toBe(true);
  expect(llamado).toBe(1);
});

test('pedirPersistencia devuelve false si persist falla', async () => {
  fijarNavigator({ storage: { persist: async () => { throw new Error('x'); } } });
  expect(await pedirPersistencia()).toBe(false);
});

test('estaInstalada detecta el modo standalone', () => {
  fijarNavigator({});
  g.matchMedia = (q: string) => ({ matches: q === '(display-mode: standalone)' });
  expect(estaInstalada()).toBe(true);
});

test('estaInstalada detecta navigator.standalone de iOS', () => {
  fijarNavigator({ standalone: true });
  g.matchMedia = () => ({ matches: false });
  expect(estaInstalada()).toBe(true);
});

test('estaInstalada es false en Safari común o sin matchMedia', () => {
  fijarNavigator({});
  g.matchMedia = () => ({ matches: false });
  expect(estaInstalada()).toBe(false);
  g.matchMedia = undefined;
  expect(estaInstalada()).toBe(false);
});

const DIA = 86_400_000;

test('el aviso se muestra si no está instalada y nunca se cerró', () => {
  expect(mostrarAvisoInstalar(false, null, 1000)).toBe(true);
});

test('el aviso no se muestra si está instalada', () => {
  expect(mostrarAvisoInstalar(true, null, 1000)).toBe(false);
});

test('el aviso cerrado no vuelve en 7 días', () => {
  expect(mostrarAvisoInstalar(false, 0, 6 * DIA)).toBe(false);
  expect(mostrarAvisoInstalar(false, 0, 7 * DIA)).toBe(true);
});
