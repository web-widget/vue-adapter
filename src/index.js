/* global document, HTMLElement, ShadowRoot */

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

async function mount(options, instance, props) {
  const vueOptions = await resolveVueOptions(options, props);
  const rootNode = props.container.getRootNode();
  const inShadowDOM = rootNode instanceof ShadowRoot;
  const oldStyleNodes = [...rootNode.querySelectorAll('style')];
  const mounted = () => {
    const newStyleNodes = [...rootNode.querySelectorAll('style')];
    instance.styleNodes = newStyleNodes.filter(
      node => !oldStyleNodes.includes(node)
    );

    return instance.vueInstance;
  };

  if (!vueOptions.el) {
    vueOptions.el = document.createElement('div');
  }

  if (inShadowDOM && !vueOptions.shadowRoot) {
    vueOptions.shadowRoot = props.container;
  }

  let vueRrenderRoot = vueOptions.el;
  if (typeof vueOptions.el === 'string') {
    vueRrenderRoot =
      rootNode.querySelector(vueOptions.el) ||
      document.querySelector(vueOptions.el);
    if (!vueRrenderRoot) {
      throw Error(
        `If vueOptions.el is provided to vue-adapter, the dom element must exist in the dom. Was provided as ${vueOptions.el}`
      );
    }
  }

  props.container.appendChild(vueRrenderRoot);
  instance.vueRrenderRoot = vueRrenderRoot;

  if (!vueOptions.render && !vueOptions.template && options.rootComponent) {
    vueOptions.render = h => h(options.rootComponent);
  }

  if (!vueOptions.data) {
    vueOptions.data = {};
  }

  vueOptions.data = () => ({ ...vueOptions.data, ...props.data });

  if (options.createApp) {
    instance.vueInstance = options.createApp(vueOptions);
    if (options.handleInstance) {
      await Promise.resolve(
        options.handleInstance(instance.vueInstance, props)
      );

      instance.root = instance.vueInstance.mount(vueOptions.el);
      return mounted();
    }
    instance.root = instance.vueInstance.mount(vueOptions.el);
  } else {
    instance.vueInstance = new options.Vue(vueOptions);
    if (instance.vueInstance.bind) {
      instance.vueInstance = instance.vueInstance.bind(instance.vueInstance);
    }
    if (options.handleInstance) {
      await options.handleInstance(instance.vueInstance, props);
      return mounted();
    }
  }

  return mounted();
}

async function update(options, instance, props) {
  const data = {
    ...(options.vueOptions.data || {}),
    ...props.data
  };
  const root = instance.root || instance.vueInstance;
  for (const prop in data) {
    root[prop] = data[prop];
  }
}

async function unmount(options, instance) {
  if (options.createApp) {
    instance.vueInstance.unmount(instance.vueRrenderRoot);
  } else {
    instance.vueInstance.$destroy();
  }

  if (instance.vueInstance.$el) {
    instance.vueInstance.$el.innerHTML = '';
    if (instance.vueInstance.$el.parentNode) {
      instance.vueInstance.$el.parentNode.removeChild(instance.vueInstance.$el);
    }
  }

  instance.styleNodes.forEach(node => {
    node.parentNode.removeChild(node);
  });

  instance.vueRrenderRoot.innerHTML = '';

  delete instance.vueInstance;
  delete instance.vueRrenderRoot;
  delete instance.styleNodes;
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

  return () => {
    const instance = {};
    return {
      bootstrap: bootstrap.bind(null, options, instance),
      mount: mount.bind(null, options, instance),
      unmount: unmount.bind(null, options, instance),
      update: update.bind(null, options, instance)
    };
  };
}
