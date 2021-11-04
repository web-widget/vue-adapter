# vue-adapter

Generic lifecycle hooks for Vue.js applications that are registered as [applications](https://web-widget.js.org/docs/application/overview/) of [web-widget](https://github.com/web-widget/web-widget).

## Installation

The [vue-adapter](https://github.com/web-widget/vue-adapter) will get everything set up.

```sh
npm install --save @web-widget/vue-adapter
```

Alternatively, you can use @web-widget/vue-adapter by adding `<script src="https://unpkg.com/@web-widget/vue-adapter"></script>` to your HTML file and
accessing the `WebWidgetVueAdapter` global variable.

## Usage

```js
import { createAdapter } from '@web-widget/vue-adapter';

export default createAdapter({...});
```

### Vue 2

For Vue 2, change your application's entry file to be the following:

```js
import Vue from 'vue';
import App from './App.vue';
import router from './router';
import { createAdapter } from '@web-widget/vue-adapter';

export default createAdapter({
  Vue,
  vueOptions: {
    render(h) {
      return h(App);
    },
    router,
  },
});
```

### Vue 3

For Vue 3, change your application's entry file to be the following:

```js
import { h, createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createAdapter } from '@web-widget/vue-adapter';

export default createAdapter({
  createApp,
  vueOptions: {
    render() {
      return h(App, {
        // name: this.name
      });
    },
  },
  handleInstance: (app) => {
    app.use(router);
  }
});
```

## Options

All options are passed to vue-adapter via the `opts` parameter when calling `createAdapter(opts)`. The following options are available:

- `Vue`: (required) The main Vue object, which is generally either exposed onto the window or is available via `require('vue')` `import Vue from 'vue'`.
- `vueOptions`: (required) An object or async function which will be used to instantiate your Vue.js application. `vueOptions` will pass directly through to `new Vue(vueOptions)`. Note that if you do not provide an `el` to vueOptions, that a div will be created and appended to the DOM as a default container for your Vue application. When `vueOptions` is an async function, it receives the Web Widget application props as an argument.
- `loadRootComponent`: (optional and replaces `vueOptions.render`) A promise that resolves with your root component. This is useful for lazy loading.
- `handleInstance`: (optional) A method can be used to handle Vue instance. Vue 3 brings [new instance API](https://v3.vuejs.org/guide/migration/global-api.html#a-new-global-api-createapp), and you can access *the app instance* from this, like `handleInstance: (app, props) => app.use(router)`. For Vue 2 users, a [Vue instance](https://vuejs.org/v2/guide/instance.html) can be accessed. The `handleInstance(app, props)` function receives the instance as its first argument, and Web Widget application props as its second argument. If handleInstance returns a promise, vue-adapter will wait to resolve the app / parcel's `mount` lifecycle until the handleInstance promise resolves.

To configure which dom element the Web Widget application is mounted to, use [vueOptions.el](https://vuejs.org/v2/api/#el):

```js
const vueLifecycles = createAdapter({
  Vue,
  vueOptions: {
    render: h => h(App),
    el: '#a-special-container',
  },
});
```

To configure options asynchronously return a promise from vueOptions function:

```js
const vueLifecycles = createAdapter({
  Vue,
  async vueOptions() {
    return {
      router: await routerFactory(),
      render: h => h(App)
    }
  },
});
```

## Thanks

<https://github.com/single-spa/single-spa-vue>