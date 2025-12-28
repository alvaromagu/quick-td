import { add, list, main, search } from './apps/index.js';

const [appKey, ...args] = process.argv.slice(2);

const apps = {
  list,
  search,
  add,
};

const app = apps[appKey] ?? main;
app(args).catch(console.error);
