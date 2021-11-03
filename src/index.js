/* global document, HTMLElement, CSS */

import 'css.escape';

const defaultOptions = {
  // required options
  vueOptions: null,
  template: null,

  // sometimes require options
  Vue: null,
  createApp: null,
  handleInstance: null
};

async function bootstrap(options) {
  if (options.loadRootComponent) {
    options.rootComponent = await options.loadRootComponent();
  }
}

async function resolveVueOptions(options, props) {
  if (typeof options.vueOptions === 'function') {
    return options.vueOptions(props);
  }
  return { ...options.vueOptions };
}

async function mount(options, mountedInstances, props) {
  const instance = {};
  const vueOptions = await resolveVueOptions(options, props);
  const rootNode = props.container.getRootNode();

  if (!vueOptions.el) {
    vueOptions.el = props.container;
  }

  let domEl;
  if (typeof vueOptions.el === 'string') {
    domEl = rootNode.querySelector(vueOptions.el);
    if (!domEl) {
      throw Error(
        `If vueOptions.el is provided to vue-adapter, the dom element must exist in the dom. Was provided as ${vueOptions.el}`
      );
    }
  } else {
    domEl = vueOptions.el;
    if (!domEl.id) {
      domEl.id = `web-widget-application:${props.name}`;
    }
    vueOptions.el = `#${CSS.escape(domEl.id)}`;
  }

  if (!options.replaceMode) {
    vueOptions.el += ' .web-widget-vue-container';
  }

  // single-spa-vue@>=2 always REPLACES the `el` instead of appending to it.
  // We want domEl to stick around and not be replaced. So we tell Vue to mount
  // into a container div inside of the main domEl
  if (!domEl.querySelector('.web-widget-vue-container')) {
    const singleSpaContainer = document.createElement('div');
    singleSpaContainer.className = 'web-widget-vue-container';
    domEl.appendChild(singleSpaContainer);
  }

  instance.domEl = domEl;

  if (!vueOptions.render && !vueOptions.template && options.rootComponent) {
    vueOptions.render = h => h(options.rootComponent);
  }

  if (!vueOptions.data) {
    vueOptions.data = props.data;
  }

  vueOptions.data = () => ({ ...vueOptions.data, ...props });

  if (options.createApp) {
    instance.vueInstance = options.createApp(vueOptions);
    if (options.handleInstance) {
      await Promise.resolve(
        options.handleInstance(instance.vueInstance, props)
      );

      instance.root = instance.vueInstance.mount(vueOptions.el);
      mountedInstances[props.name] = instance;

      return instance.vueInstance;
    }
    instance.root = instance.vueInstance.mount(vueOptions.el);
  } else {
    instance.vueInstance = new options.Vue(vueOptions);
    if (instance.vueInstance.bind) {
      instance.vueInstance = instance.vueInstance.bind(instance.vueInstance);
    }
    if (options.handleInstance) {
      await options.handleInstance(instance.vueInstance, props);
      mountedInstances[props.name] = instance;
      return instance.vueInstance;
    }
  }

  mountedInstances[props.name] = instance;

  return instance.vueInstance;
}

async function update(options, mountedInstances, props) {
  const instance = mountedInstances[props.name];
  const data = {
    ...(options.vueOptions.data || {}),
    ...props
  };
  const root = instance.root || instance.vueInstance;
  for (const prop in data) {
    root[prop] = data[prop];
  }
}

async function unmount(options, mountedInstances, props) {
  const instance = mountedInstances[props.name];
  if (options.createApp) {
    instance.vueInstance.unmount(instance.domEl);
  } else {
    instance.vueInstance.$destroy();
    instance.vueInstance.$el.innerHTML = '';
  }
  delete instance.vueInstance;

  if (instance.domEl) {
    instance.domEl.innerHTML = '';
    delete instance.domEl;
  }
}

export default function createAdapter(userOptions) {
  if (typeof userOptions !== 'object') {
    throw new Error(`Requires a configuration object`);
  }

  const options = {
    ...defaultOptions,
    ...userOptions
  };

  if (!options.Vue && !options.createApp) {
    throw Error('Must be passed options.Vue or options.createApp');
  }

  if (!options.vueOptions) {
    throw Error('Must be passed options.vueOptions');
  }

  if (
    options.vueOptions.el &&
    typeof options.vueOptions.el !== 'string' &&
    !(options.vueOptions.el instanceof HTMLElement)
  ) {
    throw Error(
      `vueOptions.el must be a string CSS selector, an HTMLElement, or not provided at all. Was given ${typeof options
        .vueOptions.el}`
    );
  }

  options.createApp =
    options.createApp || (options.Vue && options.Vue.createApp);

  // Just a shared object to store the mounted object state
  // key - name of single-spa app, since it is unique
  const mountedInstances = {};

  return () => ({
    bootstrap: bootstrap.bind(null, options, mountedInstances),
    mount: mount.bind(null, options, mountedInstances),
    unmount: unmount.bind(null, options, mountedInstances),
    update: update.bind(null, options, mountedInstances)
  });
}
