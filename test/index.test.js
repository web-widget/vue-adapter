/* global window, document, describe, beforeEach, afterEach, expect, jest, it, CSS, fail, setTimeout */

import createAdapter from '../src/index';

const domElId = `web-widget-application:test-app`;
const cssSelector = `#web-widget-application\\:test-app`;

function createSingleLifecycles() {
  return createAdapter(...arguments)();
}

describe('web-widget-vue-adapter', () => {
  let Vue, $destroy;

  const createProps = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    return {
      name: 'test-app',
      container
    };
  };

  beforeEach(() => {
    Vue = jest.fn();

    Vue.mockImplementation(function () {
      this.$destroy = $destroy;
      this.$el = { innerHTML: '' };
    });

    $destroy = jest.fn();
  });

  afterEach(() => {
    document.querySelectorAll(cssSelector).forEach(node => {
      node.remove();
    });
  });

  it(`calls new Vue() during mount and mountedInstances.instance.$destroy() on unmount`, () => {
    const handleInstance = jest.fn();

    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {},
      handleInstance
    });

    return lifecycles
      .bootstrap(props)
      .then(() => {
        expect(Vue).not.toHaveBeenCalled();
        expect(handleInstance).not.toHaveBeenCalled();
        expect($destroy).not.toHaveBeenCalled();
        return lifecycles.mount(props);
      })
      .then(() => {
        expect(Vue).toHaveBeenCalled();
        expect(handleInstance).toHaveBeenCalled();
        expect($destroy).not.toHaveBeenCalled();
        return lifecycles.unmount(props);
      })
      .then(() => {
        expect($destroy).toHaveBeenCalled();
      });
  });

  it(`creates a dom element container for you if you don't provide one`, () => {
    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {}
    });

    expect(document.getElementById(domElId)).toBe(null);

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() => {
        expect(document.getElementById(domElId)).toBeTruthy();
      });
  });

  it(`uses the vueOptions.el selector string if provided, and wraps the web-widget application in a container div`, () => {
    document.body.appendChild(
      Object.assign(document.createElement('div'), {
        id: 'my-custom-el'
      })
    );

    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {
        el: '#my-custom-el'
      }
    });

    expect(
      document.querySelector(`#my-custom-el .web-widget-vue-container`)
    ).toBe(null);

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() => {
        expect(
          document.querySelector(`#my-custom-el .web-widget-vue-container`)
        ).toBeTruthy();

        document.querySelector('#my-custom-el').remove();
      });
  });

  it(`uses the vueOptions.el domElement (with id) if provided, and wraps the web-widget application in a container div`, () => {
    const domEl = Object.assign(document.createElement('div'), {
      id: 'my-custom-el-2'
    });

    document.body.appendChild(domEl);

    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {
        el: domEl
      }
    });

    expect(
      document.querySelector(`#my-custom-el-2 .web-widget-vue-container`)
    ).toBe(null);

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() => {
        expect(Vue).toHaveBeenCalled();
        expect(Vue.mock.calls[0][0].el).toBe(
          '#my-custom-el-2 .web-widget-vue-container'
        );
        // ------
        // expect(Vue.mock.calls[0][0].data()).toEqual({
        //   name: 'test-app'
        // });
      })
      .then(() => {
        expect(
          document.querySelector(`#my-custom-el-2 .web-widget-vue-container`)
        ).toBeTruthy();
        domEl.remove();
      });
  });

  it(`uses the vueOptions.el domElement (without id) if provided, and wraps the web-widget application in a container div`, () => {
    const domEl = document.createElement('div');

    document.body.appendChild(domEl);

    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {
        el: domEl
      }
    });

    const htmlId = CSS.escape('web-widget-application:test-app');

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() => {
        expect(Vue.mock.calls[0][0].el).toBe(
          `#${htmlId} .web-widget-vue-container`
        );
        //--------
        // expect(Vue.mock.calls[0][0].data()).toEqual({
        //   name: 'test-app'
        // });
      })
      .then(() => {
        expect(
          document.querySelector(`#${htmlId} .web-widget-vue-container`)
        ).toBeTruthy();
        domEl.remove();
      });
  });

  it(`throws an error if vueOptions.el is not passed in as a string or dom element`, () => {
    expect(() => {
      createSingleLifecycles({
        Vue,
        vueOptions: {
          // `el` should be a string or DOM Element
          el: 1233
        }
      });
    }).toThrow(/must be a string CSS selector/);
  });

  it(`throws an error if vueOptions.el doesn't exist in the dom`, () => {
    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {
        el: '#doesnt-exist-in-dom'
      }
    });

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() => {
        fail('should throw validation error');
      })
      .catch(err => {
        expect(err.message).toMatch('the dom element must exist in the dom');
      });
  });

  it(`reuses the default dom element container on the second mount`, () => {
    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {}
    });

    expect(document.querySelectorAll(cssSelector).length).toBe(0);

    let firstEl;

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() => {
        expect(document.querySelectorAll(cssSelector).length).toBe(1);
        firstEl = Vue.mock.calls[0].el;
        return lifecycles.unmount(props);
      })
      .then(() => {
        expect(document.querySelectorAll(cssSelector).length).toBe(1);
        Vue.mockReset();
        return lifecycles.mount(props);
      })
      .then(() => {
        expect(document.querySelectorAll(cssSelector).length).toBe(1);
        const secondEl = Vue.mock.calls[0].el;
        expect(firstEl).toBe(secondEl);
      });
  });

  it(`passes vueOptions straight through to Vue`, () => {
    const props = createProps();
    const vueOptions = {
      something: 'random'
    };
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions
    });

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() => {
        expect(Vue).toHaveBeenCalled();
        expect(Vue.mock.calls[0][0].something).toBeTruthy();
        return lifecycles.unmount(props);
      });
  });

  it(`resolves vueOptions from Promise and passes straight through to Vue`, () => {
    const props = createProps();
    const vueOptions = () =>
      Promise.resolve({
        something: 'random'
      });

    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions
    });

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() => {
        expect(Vue).toHaveBeenCalled();
        expect(Vue.mock.calls[0][0].something).toBeTruthy();
        return lifecycles.unmount(props);
      });
  });

  it(`vueOptions function will recieve the props provided at mount`, () => {
    const props = createProps();
    const vueOptions = jest.fn(props =>
      Promise.resolve({
        props
      })
    );

    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions
    });

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() => {
        expect(vueOptions.mock.calls[0][0]).toBe(props);
        return lifecycles.unmount(props);
      });
  });

  it('`handleInstance` function will recieve the props provided at mount', () => {
    const handleInstance = jest.fn();
    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {},
      handleInstance
    });

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() => {
        expect(handleInstance.mock.calls[0][1]).toBe(props);
        return lifecycles.unmount(props);
      });
  });

  it(`implements a render function for you if you provide loadRootComponent`, () => {
    const opts = {
      Vue,
      vueOptions: {},
      loadRootComponent: jest.fn()
    };

    opts.loadRootComponent.mockReturnValue(Promise.resolve({}));

    const props = createProps();
    const lifecycles = createSingleLifecycles(opts);

    return lifecycles
      .bootstrap(props)
      .then(() => {
        expect(opts.loadRootComponent).toHaveBeenCalled();
        return lifecycles.mount(props);
      })
      .then(() => {
        expect(Vue.mock.calls[0][0].render).toBeDefined();
        return lifecycles.unmount(props);
      });
  });

  it(`adds the web-widget props as data to the root component`, () => {
    const props = createProps();
    props.someCustomThing = 'hi';

    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {}
    });

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() => {
        expect(Vue).toHaveBeenCalled();
        expect(Vue.mock.calls[0][0].data()).toBeTruthy();
        expect(Vue.mock.calls[0][0].data().name).toBe('test-app');
        expect(Vue.mock.calls[0][0].data().someCustomThing).toBe('hi');
        return lifecycles.unmount(props);
      });
  });

  it(`mounts into the web-widget-vue-container div if you don't provide an 'el' in vueOptions`, () => {
    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {}
    });

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() => {
        expect(Vue).toHaveBeenCalled();
        expect(Vue.mock.calls[0][0].el).toBe(
          `${cssSelector} .web-widget-vue-container`
        );
        return lifecycles.unmount(props);
      });
  });

  it(`mounts will return promise with vue instance`, () => {
    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {}
    });
    return lifecycles
      .bootstrap(props)
      .then(() =>
        lifecycles.mount(props).then(instance => {
          expect(Vue).toHaveBeenCalled();
          expect(instance instanceof Vue).toBeTruthy();
        })
      )
      .then(() => lifecycles.unmount(props));
  });

  it(`mounts 2 instances and then unmounts them`, () => {
    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {}
    });

    const obj1 = {
      props,
      spy: null
    };
    const obj2 = {
      props: { name: 'test-app-2', container: document.createElement('div') },
      spy: null
    };

    function mount(obj) {
      return lifecycles.mount(obj.props).then(instance => {
        expect(instance instanceof Vue).toBeTruthy();

        // since $destroy is always pointing to the same function (as it is defined it beforeEach()),
        // it is needed to be overwritten
        const oldDestroy = instance.$destroy;
        instance.$destroy = (...args) => oldDestroy.apply(instance, args);

        obj.spy = jest.spyOn(instance, '$destroy');
      });
    }

    function unmount(obj) {
      expect(obj.spy).not.toBeCalled();
      return lifecycles.unmount(obj.props).then(() => {
        expect(obj.spy).toBeCalled();
      });
    }

    return lifecycles
      .bootstrap(props)
      .then(() => mount(obj1))
      .then(() => mount(obj2))
      .then(() => unmount(obj1))
      .then(() => unmount(obj2));
  });

  it(`works with Vue 3 when you provide the full Vue module as an opt`, async () => {
    Vue = {
      createApp: jest.fn()
    };

    const appMock = jest.fn();
    appMock.mount = jest.fn();
    appMock.unmount = jest.fn();

    window.appMock = appMock;

    Vue.createApp.mockReturnValue(appMock);

    const props = {
      name: 'vue3-app',
      container: document.createElement('div')
    };

    const handleInstance = jest.fn();

    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {},
      handleInstance
    });

    await lifecycles.bootstrap(props);
    await lifecycles.mount(props);

    expect(Vue.createApp).toHaveBeenCalled();
    // Vue 3 requires the data to be a function
    expect(typeof Vue.createApp.mock.calls[0][0].data).toBe('function');
    expect(handleInstance).toHaveBeenCalledWith(appMock, props);
    expect(appMock.mount).toHaveBeenCalled();

    await lifecycles.unmount(props);
    expect(appMock.unmount).toHaveBeenCalled();
  });

  it(`works with Vue 3 when you provide the createApp function opt`, async () => {
    const createApp = jest.fn();

    const appMock = jest.fn();
    appMock.mount = jest.fn();
    appMock.unmount = jest.fn();

    window.appMock = appMock;

    createApp.mockReturnValue(appMock);

    const props = {
      name: 'vue3-app',
      container: document.createElement('div')
    };

    const handleInstance = jest.fn();

    const lifecycles = createSingleLifecycles({
      createApp,
      vueOptions: {},
      handleInstance
    });

    await lifecycles.bootstrap(props);
    await lifecycles.mount(props);

    expect(createApp).toHaveBeenCalled();
    // Vue 3 requires the data to be a function
    expect(typeof createApp.mock.calls[0][0].data).toBe('function');
    expect(handleInstance).toHaveBeenCalledWith(appMock, props);
    expect(appMock.mount).toHaveBeenCalled();

    await lifecycles.unmount(props);
    expect(appMock.unmount).toHaveBeenCalled();
  });

  it(`support async handleInstance with creatApp to allow App resolve all children routes before rehydration`, async () => {
    const createApp = jest.fn();

    const appMock = jest.fn();
    appMock.mount = jest.fn();
    appMock.unmount = jest.fn();

    window.appMock = appMock;

    createApp.mockReturnValue(appMock);

    const props = {
      name: 'vue3-app',
      container: document.createElement('div')
    };

    let handleInstancePromise;

    const handleInstance = jest.fn(async () => {
      handleInstancePromise = new Promise(resolve => {
        setTimeout(resolve);
      });

      await handleInstancePromise;
    });

    const lifecycles = createSingleLifecycles({
      createApp,
      vueOptions: {},
      handleInstance
    });

    await lifecycles.bootstrap(props);

    await lifecycles.mount(props);

    expect(handleInstance).toHaveBeenCalledWith(appMock, props);
    expect(createApp).toHaveBeenCalled();
    // Vue 3 requires the data to be a function
    expect(typeof createApp.mock.calls[0][0].data).toBe('function');

    expect(appMock.mount).toHaveBeenCalled();

    await lifecycles.unmount(props);
    expect(appMock.unmount).toHaveBeenCalled();
  });

  it(`support async handleInstance without createApp to allow App resolve all children routes before rehydration`, async () => {
    let handleInstancePromise;

    const handleInstance = jest.fn(async () => {
      handleInstancePromise = new Promise(resolve => {
        setTimeout(resolve);
      });

      await handleInstancePromise;
    });

    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {},
      handleInstance
    });

    await lifecycles.bootstrap(props);

    await lifecycles.mount(props);

    expect(handleInstance).toHaveBeenCalled();

    await lifecycles.unmount(props);
  });

  it(`mounts a Vue instance in specified element, if replaceMode is true`, () => {
    const domEl = document.createElement('div');
    const htmlId = CSS.escape('web-widget-application:test-app');

    document.body.appendChild(domEl);

    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {
        el: domEl
      },
      replaceMode: true
    });

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() => expect(Vue.mock.calls[0][0].el).toBe(`#${htmlId}`))
      .then(() => {
        expect(document.querySelector(`#${htmlId}`)).toBeTruthy();
        domEl.remove();
      });
  });

  it(`mounts a Vue instance with ' .web-widget-vue-container' if replaceMode is false or not provided`, () => {
    const domEl = document.createElement('div');
    const htmlId = CSS.escape('web-widget-application:test-app');

    document.body.appendChild(domEl);

    const props = createProps();
    const lifecycles = createSingleLifecycles({
      Vue,
      vueOptions: {
        el: domEl
      }
    });

    return lifecycles
      .bootstrap(props)
      .then(() => lifecycles.mount(props))
      .then(() =>
        expect(Vue.mock.calls[0][0].el).toBe(
          `#${htmlId} .web-widget-vue-container`
        )
      )
      .then(() => {
        expect(
          document.querySelector(`#${htmlId} .web-widget-vue-container`)
        ).toBeTruthy();
        domEl.remove();
      });
  });
});
