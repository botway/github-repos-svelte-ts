
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }
    function compute_slots(slots) {
        const result = {};
        for (const key in slots) {
            result[key] = true;
        }
        return result;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function set_svg_attributes(node, attributes) {
        for (const key in attributes) {
            attr(node, key, attributes[key]);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    /* node_modules/carbon-icons-svelte/lib/ChevronRight16/ChevronRight16.svelte generated by Svelte v3.38.2 */

    function create_if_block$r(ctx) {
    	let title_1;
    	let t;

    	return {
    		c() {
    			title_1 = svg_element("title");
    			t = text(/*title*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, title_1, anchor);
    			append(title_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 4) set_data(t, /*title*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(title_1);
    		}
    	};
    }

    // (38:8)      
    function fallback_block$c(ctx) {
    	let if_block_anchor;
    	let if_block = /*title*/ ctx[2] && create_if_block$r(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$r(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$F(ctx) {
    	let svg;
    	let path;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	const default_slot_or_fallback = default_slot || fallback_block$c(ctx);

    	let svg_levels = [
    		{ "data-carbon-icon": "ChevronRight16" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 16 16" },
    		{ fill: "currentColor" },
    		{ width: "16" },
    		{ height: "16" },
    		{ class: /*className*/ ctx[0] },
    		{ preserveAspectRatio: "xMidYMid meet" },
    		{ style: /*style*/ ctx[3] },
    		{ id: /*id*/ ctx[1] },
    		/*attributes*/ ctx[4]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr(path, "d", "M11 8L6 13 5.3 12.3 9.6 8 5.3 3.7 6 3z");
    			set_svg_attributes(svg, svg_data);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(svg, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(svg, "click", /*click_handler*/ ctx[12]),
    					listen(svg, "mouseover", /*mouseover_handler*/ ctx[13]),
    					listen(svg, "mouseenter", /*mouseenter_handler*/ ctx[14]),
    					listen(svg, "mouseleave", /*mouseleave_handler*/ ctx[15]),
    					listen(svg, "keyup", /*keyup_handler*/ ctx[16]),
    					listen(svg, "keydown", /*keydown_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*title*/ 4) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "data-carbon-icon": "ChevronRight16" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 16 16" },
    				{ fill: "currentColor" },
    				{ width: "16" },
    				{ height: "16" },
    				(!current || dirty & /*className*/ 1) && { class: /*className*/ ctx[0] },
    				{ preserveAspectRatio: "xMidYMid meet" },
    				(!current || dirty & /*style*/ 8) && { style: /*style*/ ctx[3] },
    				(!current || dirty & /*id*/ 2) && { id: /*id*/ ctx[1] },
    				dirty & /*attributes*/ 16 && /*attributes*/ ctx[4]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$F($$self, $$props, $$invalidate) {
    	let ariaLabel;
    	let ariaLabelledBy;
    	let labelled;
    	let attributes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { tabindex = undefined } = $$props;
    	let { focusable = false } = $$props;
    	let { title = undefined } = $$props;
    	let { style = undefined } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(18, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("class" in $$new_props) $$invalidate(0, className = $$new_props.class);
    		if ("id" in $$new_props) $$invalidate(1, id = $$new_props.id);
    		if ("tabindex" in $$new_props) $$invalidate(5, tabindex = $$new_props.tabindex);
    		if ("focusable" in $$new_props) $$invalidate(6, focusable = $$new_props.focusable);
    		if ("title" in $$new_props) $$invalidate(2, title = $$new_props.title);
    		if ("style" in $$new_props) $$invalidate(3, style = $$new_props.style);
    		if ("$$scope" in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		$$invalidate(7, ariaLabel = $$props["aria-label"]);
    		$$invalidate(8, ariaLabelledBy = $$props["aria-labelledby"]);

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, title*/ 388) {
    			$$invalidate(9, labelled = ariaLabel || ariaLabelledBy || title);
    		}

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, labelled, tabindex, focusable*/ 992) {
    			$$invalidate(4, attributes = {
    				"aria-label": ariaLabel,
    				"aria-labelledby": ariaLabelledBy,
    				"aria-hidden": labelled ? undefined : true,
    				role: labelled ? "img" : undefined,
    				focusable: tabindex === "0" ? true : focusable,
    				tabindex
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		className,
    		id,
    		title,
    		style,
    		attributes,
    		tabindex,
    		focusable,
    		ariaLabel,
    		ariaLabelledBy,
    		labelled,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		keyup_handler,
    		keydown_handler
    	];
    }

    class ChevronRight16 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$F, create_fragment$F, safe_not_equal, {
    			class: 0,
    			id: 1,
    			tabindex: 5,
    			focusable: 6,
    			title: 2,
    			style: 3
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/AspectRatio/AspectRatio.svelte generated by Svelte v3.38.2 */

    function create_fragment$E(ctx) {
    	let div1;
    	let div0;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);
    	let div1_levels = [/*$$restProps*/ ctx[1]];
    	let div1_data = {};

    	for (let i = 0; i < div1_levels.length; i += 1) {
    		div1_data = assign(div1_data, div1_levels[i]);
    	}

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			toggle_class(div0, "bx--aspect-ratio--object", true);
    			set_attributes(div1, div1_data);
    			toggle_class(div1, "bx--aspect-ratio", true);
    			toggle_class(div1, "bx--aspect-ratio--2x1", /*ratio*/ ctx[0] === "2x1");
    			toggle_class(div1, "bx--aspect-ratio--16x9", /*ratio*/ ctx[0] === "16x9");
    			toggle_class(div1, "bx--aspect-ratio--4x3", /*ratio*/ ctx[0] === "4x3");
    			toggle_class(div1, "bx--aspect-ratio--1x1", /*ratio*/ ctx[0] === "1x1");
    			toggle_class(div1, "bx--aspect-ratio--3x4", /*ratio*/ ctx[0] === "3x4");
    			toggle_class(div1, "bx--aspect-ratio--3x2", /*ratio*/ ctx[0] === "3x2");
    			toggle_class(div1, "bx--aspect-ratio--9x16", /*ratio*/ ctx[0] === "9x16");
    			toggle_class(div1, "bx--aspect-ratio--1x2", /*ratio*/ ctx[0] === "1x2");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			set_attributes(div1, div1_data = get_spread_update(div1_levels, [dirty & /*$$restProps*/ 2 && /*$$restProps*/ ctx[1]]));
    			toggle_class(div1, "bx--aspect-ratio", true);
    			toggle_class(div1, "bx--aspect-ratio--2x1", /*ratio*/ ctx[0] === "2x1");
    			toggle_class(div1, "bx--aspect-ratio--16x9", /*ratio*/ ctx[0] === "16x9");
    			toggle_class(div1, "bx--aspect-ratio--4x3", /*ratio*/ ctx[0] === "4x3");
    			toggle_class(div1, "bx--aspect-ratio--1x1", /*ratio*/ ctx[0] === "1x1");
    			toggle_class(div1, "bx--aspect-ratio--3x4", /*ratio*/ ctx[0] === "3x4");
    			toggle_class(div1, "bx--aspect-ratio--3x2", /*ratio*/ ctx[0] === "3x2");
    			toggle_class(div1, "bx--aspect-ratio--9x16", /*ratio*/ ctx[0] === "9x16");
    			toggle_class(div1, "bx--aspect-ratio--1x2", /*ratio*/ ctx[0] === "1x2");
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$E($$self, $$props, $$invalidate) {
    	const omit_props_names = ["ratio"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { ratio = "2x1" } = $$props;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(1, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("ratio" in $$new_props) $$invalidate(0, ratio = $$new_props.ratio);
    		if ("$$scope" in $$new_props) $$invalidate(2, $$scope = $$new_props.$$scope);
    	};

    	return [ratio, $$restProps, $$scope, slots];
    }

    class AspectRatio extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$E, create_fragment$E, safe_not_equal, { ratio: 0 });
    	}
    }

    /* node_modules/carbon-components-svelte/src/Link/Link.svelte generated by Svelte v3.38.2 */

    function create_else_block$b(ctx) {
    	let a;
    	let a_rel_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);
    	let if_block = !/*inline*/ ctx[3] && /*icon*/ ctx[4] && create_if_block_2$6(ctx);

    	let a_levels = [
    		{
    			rel: a_rel_value = /*$$restProps*/ ctx[7].target === "_blank"
    			? "noopener noreferrer"
    			: undefined
    		},
    		{ href: /*href*/ ctx[2] },
    		/*$$restProps*/ ctx[7]
    	];

    	let a_data = {};

    	for (let i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	return {
    		c() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			if (if_block) if_block.c();
    			set_attributes(a, a_data);
    			toggle_class(a, "bx--link", true);
    			toggle_class(a, "bx--link--disabled", /*disabled*/ ctx[5]);
    			toggle_class(a, "bx--link--inline", /*inline*/ ctx[3]);
    			toggle_class(a, "bx--link--visited", /*visited*/ ctx[6]);
    			toggle_class(a, "bx--link--sm", /*size*/ ctx[1] === "sm");
    			toggle_class(a, "bx--link--lg", /*size*/ ctx[1] === "lg");
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			if (if_block) if_block.m(a, null);
    			/*a_binding*/ ctx[19](a);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(a, "click", /*click_handler_1*/ ctx[14]),
    					listen(a, "mouseover", /*mouseover_handler_1*/ ctx[15]),
    					listen(a, "mouseenter", /*mouseenter_handler_1*/ ctx[16]),
    					listen(a, "mouseleave", /*mouseleave_handler_1*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			if (!/*inline*/ ctx[3] && /*icon*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*inline, icon*/ 24) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_2$6(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(a, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			set_attributes(a, a_data = get_spread_update(a_levels, [
    				(!current || dirty & /*$$restProps*/ 128 && a_rel_value !== (a_rel_value = /*$$restProps*/ ctx[7].target === "_blank"
    				? "noopener noreferrer"
    				: undefined)) && { rel: a_rel_value },
    				(!current || dirty & /*href*/ 4) && { href: /*href*/ ctx[2] },
    				dirty & /*$$restProps*/ 128 && /*$$restProps*/ ctx[7]
    			]));

    			toggle_class(a, "bx--link", true);
    			toggle_class(a, "bx--link--disabled", /*disabled*/ ctx[5]);
    			toggle_class(a, "bx--link--inline", /*inline*/ ctx[3]);
    			toggle_class(a, "bx--link--visited", /*visited*/ ctx[6]);
    			toggle_class(a, "bx--link--sm", /*size*/ ctx[1] === "sm");
    			toggle_class(a, "bx--link--lg", /*size*/ ctx[1] === "lg");
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    			if (default_slot) default_slot.d(detaching);
    			if (if_block) if_block.d();
    			/*a_binding*/ ctx[19](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (34:0) {#if disabled}
    function create_if_block$q(ctx) {
    	let p;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);
    	let if_block = !/*inline*/ ctx[3] && /*icon*/ ctx[4] && create_if_block_1$7(ctx);
    	let p_levels = [/*$$restProps*/ ctx[7]];
    	let p_data = {};

    	for (let i = 0; i < p_levels.length; i += 1) {
    		p_data = assign(p_data, p_levels[i]);
    	}

    	return {
    		c() {
    			p = element("p");
    			if (default_slot) default_slot.c();
    			if (if_block) if_block.c();
    			set_attributes(p, p_data);
    			toggle_class(p, "bx--link", true);
    			toggle_class(p, "bx--link--disabled", /*disabled*/ ctx[5]);
    			toggle_class(p, "bx--link--inline", /*inline*/ ctx[3]);
    			toggle_class(p, "bx--link--visited", /*visited*/ ctx[6]);
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);

    			if (default_slot) {
    				default_slot.m(p, null);
    			}

    			if (if_block) if_block.m(p, null);
    			/*p_binding*/ ctx[18](p);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(p, "click", /*click_handler*/ ctx[10]),
    					listen(p, "mouseover", /*mouseover_handler*/ ctx[11]),
    					listen(p, "mouseenter", /*mouseenter_handler*/ ctx[12]),
    					listen(p, "mouseleave", /*mouseleave_handler*/ ctx[13])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			if (!/*inline*/ ctx[3] && /*icon*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*inline, icon*/ 24) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$7(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(p, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			set_attributes(p, p_data = get_spread_update(p_levels, [dirty & /*$$restProps*/ 128 && /*$$restProps*/ ctx[7]]));
    			toggle_class(p, "bx--link", true);
    			toggle_class(p, "bx--link--disabled", /*disabled*/ ctx[5]);
    			toggle_class(p, "bx--link--inline", /*inline*/ ctx[3]);
    			toggle_class(p, "bx--link--visited", /*visited*/ ctx[6]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    			if (default_slot) default_slot.d(detaching);
    			if (if_block) if_block.d();
    			/*p_binding*/ ctx[18](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (67:13) {#if !inline && icon}
    function create_if_block_2$6(ctx) {
    	let div;
    	let switch_instance;
    	let current;
    	var switch_value = /*icon*/ ctx[4];

    	function switch_props(ctx) {
    		return {};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			div = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			toggle_class(div, "bx--link__icon", true);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (switch_value !== (switch_value = /*icon*/ ctx[4])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div, null);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (switch_instance) destroy_component(switch_instance);
    		}
    	};
    }

    // (47:12) {#if !inline && icon}
    function create_if_block_1$7(ctx) {
    	let div;
    	let switch_instance;
    	let current;
    	var switch_value = /*icon*/ ctx[4];

    	function switch_props(ctx) {
    		return {};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			div = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			toggle_class(div, "bx--link__icon", true);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (switch_value !== (switch_value = /*icon*/ ctx[4])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div, null);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (switch_instance) destroy_component(switch_instance);
    		}
    	};
    }

    function create_fragment$D(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$q, create_else_block$b];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*disabled*/ ctx[5]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$D($$self, $$props, $$invalidate) {
    	const omit_props_names = ["size","href","inline","icon","disabled","visited","ref"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { size = undefined } = $$props;
    	let { href = undefined } = $$props;
    	let { inline = false } = $$props;
    	let { icon = undefined } = $$props;
    	let { disabled = false } = $$props;
    	let { visited = false } = $$props;
    	let { ref = null } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function click_handler_1(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler_1(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler_1(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler_1(event) {
    		bubble($$self, event);
    	}

    	function p_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			ref = $$value;
    			$$invalidate(0, ref);
    		});
    	}

    	function a_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			ref = $$value;
    			$$invalidate(0, ref);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(7, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("size" in $$new_props) $$invalidate(1, size = $$new_props.size);
    		if ("href" in $$new_props) $$invalidate(2, href = $$new_props.href);
    		if ("inline" in $$new_props) $$invalidate(3, inline = $$new_props.inline);
    		if ("icon" in $$new_props) $$invalidate(4, icon = $$new_props.icon);
    		if ("disabled" in $$new_props) $$invalidate(5, disabled = $$new_props.disabled);
    		if ("visited" in $$new_props) $$invalidate(6, visited = $$new_props.visited);
    		if ("ref" in $$new_props) $$invalidate(0, ref = $$new_props.ref);
    		if ("$$scope" in $$new_props) $$invalidate(8, $$scope = $$new_props.$$scope);
    	};

    	return [
    		ref,
    		size,
    		href,
    		inline,
    		icon,
    		disabled,
    		visited,
    		$$restProps,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		click_handler_1,
    		mouseover_handler_1,
    		mouseenter_handler_1,
    		mouseleave_handler_1,
    		p_binding,
    		a_binding
    	];
    }

    class Link extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$D, create_fragment$D, safe_not_equal, {
    			size: 1,
    			href: 2,
    			inline: 3,
    			icon: 4,
    			disabled: 5,
    			visited: 6,
    			ref: 0
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/Button/ButtonSkeleton.svelte generated by Svelte v3.38.2 */

    function create_else_block$a(ctx) {
    	let div;
    	let mounted;
    	let dispose;
    	let div_levels = [/*$$restProps*/ ctx[3]];
    	let div_data = {};

    	for (let i = 0; i < div_levels.length; i += 1) {
    		div_data = assign(div_data, div_levels[i]);
    	}

    	return {
    		c() {
    			div = element("div");
    			set_attributes(div, div_data);
    			toggle_class(div, "bx--skeleton", true);
    			toggle_class(div, "bx--btn", true);
    			toggle_class(div, "bx--btn--field", /*size*/ ctx[1] === "field");
    			toggle_class(div, "bx--btn--sm", /*size*/ ctx[1] === "small" || /*small*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(div, "click", /*click_handler_1*/ ctx[8]),
    					listen(div, "mouseover", /*mouseover_handler_1*/ ctx[9]),
    					listen(div, "mouseenter", /*mouseenter_handler_1*/ ctx[10]),
    					listen(div, "mouseleave", /*mouseleave_handler_1*/ ctx[11])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			set_attributes(div, div_data = get_spread_update(div_levels, [dirty & /*$$restProps*/ 8 && /*$$restProps*/ ctx[3]]));
    			toggle_class(div, "bx--skeleton", true);
    			toggle_class(div, "bx--btn", true);
    			toggle_class(div, "bx--btn--field", /*size*/ ctx[1] === "field");
    			toggle_class(div, "bx--btn--sm", /*size*/ ctx[1] === "small" || /*small*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (21:0) {#if href}
    function create_if_block$p(ctx) {
    	let a;
    	let t_value = "" + "";
    	let t;
    	let a_rel_value;
    	let mounted;
    	let dispose;

    	let a_levels = [
    		{ href: /*href*/ ctx[0] },
    		{
    			rel: a_rel_value = /*$$restProps*/ ctx[3].target === "_blank"
    			? "noopener noreferrer"
    			: undefined
    		},
    		{ role: "button" },
    		/*$$restProps*/ ctx[3]
    	];

    	let a_data = {};

    	for (let i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	return {
    		c() {
    			a = element("a");
    			t = text(t_value);
    			set_attributes(a, a_data);
    			toggle_class(a, "bx--skeleton", true);
    			toggle_class(a, "bx--btn", true);
    			toggle_class(a, "bx--btn--field", /*size*/ ctx[1] === "field");
    			toggle_class(a, "bx--btn--sm", /*size*/ ctx[1] === "small" || /*small*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			append(a, t);

    			if (!mounted) {
    				dispose = [
    					listen(a, "click", /*click_handler*/ ctx[4]),
    					listen(a, "mouseover", /*mouseover_handler*/ ctx[5]),
    					listen(a, "mouseenter", /*mouseenter_handler*/ ctx[6]),
    					listen(a, "mouseleave", /*mouseleave_handler*/ ctx[7])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			set_attributes(a, a_data = get_spread_update(a_levels, [
    				dirty & /*href*/ 1 && { href: /*href*/ ctx[0] },
    				dirty & /*$$restProps*/ 8 && a_rel_value !== (a_rel_value = /*$$restProps*/ ctx[3].target === "_blank"
    				? "noopener noreferrer"
    				: undefined) && { rel: a_rel_value },
    				{ role: "button" },
    				dirty & /*$$restProps*/ 8 && /*$$restProps*/ ctx[3]
    			]));

    			toggle_class(a, "bx--skeleton", true);
    			toggle_class(a, "bx--btn", true);
    			toggle_class(a, "bx--btn--field", /*size*/ ctx[1] === "field");
    			toggle_class(a, "bx--btn--sm", /*size*/ ctx[1] === "small" || /*small*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$C(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*href*/ ctx[0]) return create_if_block$p;
    		return create_else_block$a;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$C($$self, $$props, $$invalidate) {
    	const omit_props_names = ["href","size","small"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { href = undefined } = $$props;
    	let { size = "default" } = $$props;
    	let { small = false } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function click_handler_1(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler_1(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler_1(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("href" in $$new_props) $$invalidate(0, href = $$new_props.href);
    		if ("size" in $$new_props) $$invalidate(1, size = $$new_props.size);
    		if ("small" in $$new_props) $$invalidate(2, small = $$new_props.small);
    	};

    	return [
    		href,
    		size,
    		small,
    		$$restProps,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		click_handler_1,
    		mouseover_handler_1,
    		mouseenter_handler_1,
    		mouseleave_handler_1
    	];
    }

    class ButtonSkeleton extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$C, create_fragment$C, safe_not_equal, { href: 0, size: 1, small: 2 });
    	}
    }

    /* node_modules/carbon-components-svelte/src/Button/Button.svelte generated by Svelte v3.38.2 */
    const get_default_slot_changes$3 = dirty => ({ props: dirty[0] & /*buttonProps*/ 512 });
    const get_default_slot_context$3 = ctx => ({ props: /*buttonProps*/ ctx[9] });

    // (153:0) {:else}
    function create_else_block$9(ctx) {
    	let button;
    	let t;
    	let switch_instance;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*hasIconOnly*/ ctx[0] && create_if_block_4$4(ctx);
    	const default_slot_template = /*#slots*/ ctx[18].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[17], null);
    	var switch_value = /*icon*/ ctx[3];

    	function switch_props(ctx) {
    		return {
    			props: {
    				"aria-hidden": "true",
    				class: "bx--btn__icon",
    				"aria-label": /*iconDescription*/ ctx[4]
    			}
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	let button_levels = [/*buttonProps*/ ctx[9]];
    	let button_data = {};

    	for (let i = 0; i < button_levels.length; i += 1) {
    		button_data = assign(button_data, button_levels[i]);
    	}

    	return {
    		c() {
    			button = element("button");
    			if (if_block) if_block.c();
    			t = space();
    			if (default_slot) default_slot.c();
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			set_attributes(button, button_data);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			if (if_block) if_block.m(button, null);
    			append(button, t);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			if (switch_instance) {
    				mount_component(switch_instance, button, null);
    			}

    			/*button_binding*/ ctx[32](button);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button, "click", /*click_handler_2*/ ctx[23]),
    					listen(button, "mouseover", /*mouseover_handler_2*/ ctx[24]),
    					listen(button, "mouseenter", /*mouseenter_handler_2*/ ctx[25]),
    					listen(button, "mouseleave", /*mouseleave_handler_2*/ ctx[26])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*hasIconOnly*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_4$4(ctx);
    					if_block.c();
    					if_block.m(button, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[0] & /*$$scope*/ 131072)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[17], dirty, null, null);
    				}
    			}

    			const switch_instance_changes = {};
    			if (dirty[0] & /*iconDescription*/ 16) switch_instance_changes["aria-label"] = /*iconDescription*/ ctx[4];

    			if (switch_value !== (switch_value = /*icon*/ ctx[3])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, button, null);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}

    			set_attributes(button, button_data = get_spread_update(button_levels, [dirty[0] & /*buttonProps*/ 512 && /*buttonProps*/ ctx[9]]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    			if (switch_instance) destroy_component(switch_instance);
    			/*button_binding*/ ctx[32](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (133:28) 
    function create_if_block_2$5(ctx) {
    	let a;
    	let t;
    	let switch_instance;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*hasIconOnly*/ ctx[0] && create_if_block_3$5(ctx);
    	const default_slot_template = /*#slots*/ ctx[18].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[17], null);
    	var switch_value = /*icon*/ ctx[3];

    	function switch_props(ctx) {
    		return {
    			props: {
    				"aria-hidden": "true",
    				class: "bx--btn__icon",
    				"aria-label": /*iconDescription*/ ctx[4]
    			}
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	let a_levels = [/*buttonProps*/ ctx[9]];
    	let a_data = {};

    	for (let i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	return {
    		c() {
    			a = element("a");
    			if (if_block) if_block.c();
    			t = space();
    			if (default_slot) default_slot.c();
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			set_attributes(a, a_data);
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			if (if_block) if_block.m(a, null);
    			append(a, t);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			if (switch_instance) {
    				mount_component(switch_instance, a, null);
    			}

    			/*a_binding*/ ctx[31](a);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(a, "click", /*click_handler_1*/ ctx[19]),
    					listen(a, "mouseover", /*mouseover_handler_1*/ ctx[20]),
    					listen(a, "mouseenter", /*mouseenter_handler_1*/ ctx[21]),
    					listen(a, "mouseleave", /*mouseleave_handler_1*/ ctx[22])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*hasIconOnly*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3$5(ctx);
    					if_block.c();
    					if_block.m(a, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[0] & /*$$scope*/ 131072)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[17], dirty, null, null);
    				}
    			}

    			const switch_instance_changes = {};
    			if (dirty[0] & /*iconDescription*/ 16) switch_instance_changes["aria-label"] = /*iconDescription*/ ctx[4];

    			if (switch_value !== (switch_value = /*icon*/ ctx[3])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, a, null);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}

    			set_attributes(a, a_data = get_spread_update(a_levels, [dirty[0] & /*buttonProps*/ 512 && /*buttonProps*/ ctx[9]]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    			if (switch_instance) destroy_component(switch_instance);
    			/*a_binding*/ ctx[31](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (131:13) 
    function create_if_block_1$6(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[18].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[17], get_default_slot_context$3);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[0] & /*$$scope, buttonProps*/ 131584)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[17], dirty, get_default_slot_changes$3, get_default_slot_context$3);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (120:0) {#if skeleton}
    function create_if_block$o(ctx) {
    	let buttonskeleton;
    	let current;

    	const buttonskeleton_spread_levels = [
    		{ href: /*href*/ ctx[8] },
    		{ size: /*size*/ ctx[2] },
    		/*$$restProps*/ ctx[10],
    		{
    			style: /*hasIconOnly*/ ctx[0] && "width: 3rem;"
    		}
    	];

    	let buttonskeleton_props = {};

    	for (let i = 0; i < buttonskeleton_spread_levels.length; i += 1) {
    		buttonskeleton_props = assign(buttonskeleton_props, buttonskeleton_spread_levels[i]);
    	}

    	buttonskeleton = new ButtonSkeleton({ props: buttonskeleton_props });
    	buttonskeleton.$on("click", /*click_handler*/ ctx[27]);
    	buttonskeleton.$on("mouseover", /*mouseover_handler*/ ctx[28]);
    	buttonskeleton.$on("mouseenter", /*mouseenter_handler*/ ctx[29]);
    	buttonskeleton.$on("mouseleave", /*mouseleave_handler*/ ctx[30]);

    	return {
    		c() {
    			create_component(buttonskeleton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(buttonskeleton, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const buttonskeleton_changes = (dirty[0] & /*href, size, $$restProps, hasIconOnly*/ 1285)
    			? get_spread_update(buttonskeleton_spread_levels, [
    					dirty[0] & /*href*/ 256 && { href: /*href*/ ctx[8] },
    					dirty[0] & /*size*/ 4 && { size: /*size*/ ctx[2] },
    					dirty[0] & /*$$restProps*/ 1024 && get_spread_object(/*$$restProps*/ ctx[10]),
    					dirty[0] & /*hasIconOnly*/ 1 && {
    						style: /*hasIconOnly*/ ctx[0] && "width: 3rem;"
    					}
    				])
    			: {};

    			buttonskeleton.$set(buttonskeleton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(buttonskeleton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(buttonskeleton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(buttonskeleton, detaching);
    		}
    	};
    }

    // (162:4) {#if hasIconOnly}
    function create_if_block_4$4(ctx) {
    	let span;
    	let t;

    	return {
    		c() {
    			span = element("span");
    			t = text(/*iconDescription*/ ctx[4]);
    			toggle_class(span, "bx--assistive-text", true);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*iconDescription*/ 16) set_data(t, /*iconDescription*/ ctx[4]);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (143:4) {#if hasIconOnly}
    function create_if_block_3$5(ctx) {
    	let span;
    	let t;

    	return {
    		c() {
    			span = element("span");
    			t = text(/*iconDescription*/ ctx[4]);
    			toggle_class(span, "bx--assistive-text", true);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*iconDescription*/ 16) set_data(t, /*iconDescription*/ ctx[4]);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    function create_fragment$B(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$o, create_if_block_1$6, create_if_block_2$5, create_else_block$9];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*skeleton*/ ctx[6]) return 0;
    		if (/*as*/ ctx[5]) return 1;
    		if (/*href*/ ctx[8] && !/*disabled*/ ctx[7]) return 2;
    		return 3;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$B($$self, $$props, $$invalidate) {
    	let buttonProps;

    	const omit_props_names = [
    		"kind","size","isSelected","hasIconOnly","icon","iconDescription","tooltipAlignment","tooltipPosition","as","skeleton","disabled","href","tabindex","type","ref"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const $$slots = compute_slots(slots);
    	let { kind = "primary" } = $$props;
    	let { size = "default" } = $$props;
    	let { isSelected = false } = $$props;
    	let { hasIconOnly = false } = $$props;
    	let { icon = undefined } = $$props;
    	let { iconDescription = undefined } = $$props;
    	let { tooltipAlignment = "center" } = $$props;
    	let { tooltipPosition = "bottom" } = $$props;
    	let { as = false } = $$props;
    	let { skeleton = false } = $$props;
    	let { disabled = false } = $$props;
    	let { href = undefined } = $$props;
    	let { tabindex = "0" } = $$props;
    	let { type = "button" } = $$props;
    	let { ref = null } = $$props;
    	const ctx = getContext("ComposedModal");

    	function click_handler_1(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler_1(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler_1(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler_1(event) {
    		bubble($$self, event);
    	}

    	function click_handler_2(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler_2(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler_2(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler_2(event) {
    		bubble($$self, event);
    	}

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function a_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			ref = $$value;
    			$$invalidate(1, ref);
    		});
    	}

    	function button_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			ref = $$value;
    			$$invalidate(1, ref);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(10, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("kind" in $$new_props) $$invalidate(11, kind = $$new_props.kind);
    		if ("size" in $$new_props) $$invalidate(2, size = $$new_props.size);
    		if ("isSelected" in $$new_props) $$invalidate(12, isSelected = $$new_props.isSelected);
    		if ("hasIconOnly" in $$new_props) $$invalidate(0, hasIconOnly = $$new_props.hasIconOnly);
    		if ("icon" in $$new_props) $$invalidate(3, icon = $$new_props.icon);
    		if ("iconDescription" in $$new_props) $$invalidate(4, iconDescription = $$new_props.iconDescription);
    		if ("tooltipAlignment" in $$new_props) $$invalidate(13, tooltipAlignment = $$new_props.tooltipAlignment);
    		if ("tooltipPosition" in $$new_props) $$invalidate(14, tooltipPosition = $$new_props.tooltipPosition);
    		if ("as" in $$new_props) $$invalidate(5, as = $$new_props.as);
    		if ("skeleton" in $$new_props) $$invalidate(6, skeleton = $$new_props.skeleton);
    		if ("disabled" in $$new_props) $$invalidate(7, disabled = $$new_props.disabled);
    		if ("href" in $$new_props) $$invalidate(8, href = $$new_props.href);
    		if ("tabindex" in $$new_props) $$invalidate(15, tabindex = $$new_props.tabindex);
    		if ("type" in $$new_props) $$invalidate(16, type = $$new_props.type);
    		if ("ref" in $$new_props) $$invalidate(1, ref = $$new_props.ref);
    		if ("$$scope" in $$new_props) $$invalidate(17, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*ref*/ 2) {
    			if (ctx && ref) {
    				ctx.declareRef(ref);
    			}
    		}

    		if ($$self.$$.dirty[0] & /*icon*/ 8) {
    			$$invalidate(0, hasIconOnly = icon && !$$slots.default);
    		}

    		$$invalidate(9, buttonProps = {
    			type: href && !disabled ? undefined : type,
    			tabindex,
    			disabled,
    			href,
    			"aria-pressed": hasIconOnly && kind === "ghost" ? isSelected : undefined,
    			...$$restProps,
    			class: [
    				"bx--btn",
    				size === "field" && "bx--btn--field",
    				size === "small" && "bx--btn--sm",
    				kind && `bx--btn--${kind}`,
    				disabled && "bx--btn--disabled",
    				hasIconOnly && "bx--btn--icon-only",
    				hasIconOnly && "bx--tooltip__trigger",
    				hasIconOnly && "bx--tooltip--a11y",
    				hasIconOnly && tooltipPosition && `bx--tooltip--${tooltipPosition}`,
    				hasIconOnly && tooltipAlignment && `bx--tooltip--align-${tooltipAlignment}`,
    				hasIconOnly && isSelected && kind === "ghost" && "bx--btn--selected",
    				$$restProps.class
    			].filter(Boolean).join(" ")
    		});
    	};

    	return [
    		hasIconOnly,
    		ref,
    		size,
    		icon,
    		iconDescription,
    		as,
    		skeleton,
    		disabled,
    		href,
    		buttonProps,
    		$$restProps,
    		kind,
    		isSelected,
    		tooltipAlignment,
    		tooltipPosition,
    		tabindex,
    		type,
    		$$scope,
    		slots,
    		click_handler_1,
    		mouseover_handler_1,
    		mouseenter_handler_1,
    		mouseleave_handler_1,
    		click_handler_2,
    		mouseover_handler_2,
    		mouseenter_handler_2,
    		mouseleave_handler_2,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		a_binding,
    		button_binding
    	];
    }

    class Button extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$B,
    			create_fragment$B,
    			safe_not_equal,
    			{
    				kind: 11,
    				size: 2,
    				isSelected: 12,
    				hasIconOnly: 0,
    				icon: 3,
    				iconDescription: 4,
    				tooltipAlignment: 13,
    				tooltipPosition: 14,
    				as: 5,
    				skeleton: 6,
    				disabled: 7,
    				href: 8,
    				tabindex: 15,
    				type: 16,
    				ref: 1
    			},
    			[-1, -1]
    		);
    	}
    }

    /* node_modules/carbon-components-svelte/src/Checkbox/InlineCheckbox.svelte generated by Svelte v3.38.2 */

    function create_fragment$A(ctx) {
    	let input;
    	let input_checked_value;
    	let input_aria_checked_value;
    	let t;
    	let label;
    	let label_aria_label_value;
    	let mounted;
    	let dispose;

    	let input_levels = [
    		{ type: "checkbox" },
    		{
    			checked: input_checked_value = /*indeterminate*/ ctx[2] ? false : /*checked*/ ctx[1]
    		},
    		{ indeterminate: /*indeterminate*/ ctx[2] },
    		{ id: /*id*/ ctx[4] },
    		/*$$restProps*/ ctx[5],
    		{ "aria-label": undefined },
    		{
    			"aria-checked": input_aria_checked_value = /*indeterminate*/ ctx[2] ? "mixed" : /*checked*/ ctx[1]
    		}
    	];

    	let input_data = {};

    	for (let i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	return {
    		c() {
    			input = element("input");
    			t = space();
    			label = element("label");
    			set_attributes(input, input_data);
    			toggle_class(input, "bx--checkbox", true);
    			attr(label, "for", /*id*/ ctx[4]);
    			attr(label, "title", /*title*/ ctx[3]);
    			attr(label, "aria-label", label_aria_label_value = /*$$props*/ ctx[6]["aria-label"]);
    			toggle_class(label, "bx--checkbox-label", true);
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			/*input_binding*/ ctx[8](input);
    			insert(target, t, anchor);
    			insert(target, label, anchor);

    			if (!mounted) {
    				dispose = listen(input, "change", /*change_handler*/ ctx[7]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			set_attributes(input, input_data = get_spread_update(input_levels, [
    				{ type: "checkbox" },
    				dirty & /*indeterminate, checked*/ 6 && input_checked_value !== (input_checked_value = /*indeterminate*/ ctx[2] ? false : /*checked*/ ctx[1]) && { checked: input_checked_value },
    				dirty & /*indeterminate*/ 4 && { indeterminate: /*indeterminate*/ ctx[2] },
    				dirty & /*id*/ 16 && { id: /*id*/ ctx[4] },
    				dirty & /*$$restProps*/ 32 && /*$$restProps*/ ctx[5],
    				{ "aria-label": undefined },
    				dirty & /*indeterminate, checked*/ 6 && input_aria_checked_value !== (input_aria_checked_value = /*indeterminate*/ ctx[2] ? "mixed" : /*checked*/ ctx[1]) && { "aria-checked": input_aria_checked_value }
    			]));

    			toggle_class(input, "bx--checkbox", true);

    			if (dirty & /*id*/ 16) {
    				attr(label, "for", /*id*/ ctx[4]);
    			}

    			if (dirty & /*title*/ 8) {
    				attr(label, "title", /*title*/ ctx[3]);
    			}

    			if (dirty & /*$$props*/ 64 && label_aria_label_value !== (label_aria_label_value = /*$$props*/ ctx[6]["aria-label"])) {
    				attr(label, "aria-label", label_aria_label_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(input);
    			/*input_binding*/ ctx[8](null);
    			if (detaching) detach(t);
    			if (detaching) detach(label);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$A($$self, $$props, $$invalidate) {
    	const omit_props_names = ["checked","indeterminate","title","id","ref"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { checked = false } = $$props;
    	let { indeterminate = false } = $$props;
    	let { title = undefined } = $$props;
    	let { id = "ccs-" + Math.random().toString(36) } = $$props;
    	let { ref = null } = $$props;

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			ref = $$value;
    			$$invalidate(0, ref);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(6, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		$$invalidate(5, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("checked" in $$new_props) $$invalidate(1, checked = $$new_props.checked);
    		if ("indeterminate" in $$new_props) $$invalidate(2, indeterminate = $$new_props.indeterminate);
    		if ("title" in $$new_props) $$invalidate(3, title = $$new_props.title);
    		if ("id" in $$new_props) $$invalidate(4, id = $$new_props.id);
    		if ("ref" in $$new_props) $$invalidate(0, ref = $$new_props.ref);
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		ref,
    		checked,
    		indeterminate,
    		title,
    		id,
    		$$restProps,
    		$$props,
    		change_handler,
    		input_binding
    	];
    }

    class InlineCheckbox extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$A, create_fragment$A, safe_not_equal, {
    			checked: 1,
    			indeterminate: 2,
    			title: 3,
    			id: 4,
    			ref: 0
    		});
    	}
    }

    /* node_modules/carbon-icons-svelte/lib/CaretRight16/CaretRight16.svelte generated by Svelte v3.38.2 */

    function create_if_block$n(ctx) {
    	let title_1;
    	let t;

    	return {
    		c() {
    			title_1 = svg_element("title");
    			t = text(/*title*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, title_1, anchor);
    			append(title_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 4) set_data(t, /*title*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(title_1);
    		}
    	};
    }

    // (38:8)      
    function fallback_block$b(ctx) {
    	let if_block_anchor;
    	let if_block = /*title*/ ctx[2] && create_if_block$n(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$n(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$z(ctx) {
    	let svg;
    	let path;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	const default_slot_or_fallback = default_slot || fallback_block$b(ctx);

    	let svg_levels = [
    		{ "data-carbon-icon": "CaretRight16" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 32 32" },
    		{ fill: "currentColor" },
    		{ width: "16" },
    		{ height: "16" },
    		{ class: /*className*/ ctx[0] },
    		{ preserveAspectRatio: "xMidYMid meet" },
    		{ style: /*style*/ ctx[3] },
    		{ id: /*id*/ ctx[1] },
    		/*attributes*/ ctx[4]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr(path, "d", "M12 8L22 16 12 24z");
    			set_svg_attributes(svg, svg_data);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(svg, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(svg, "click", /*click_handler*/ ctx[12]),
    					listen(svg, "mouseover", /*mouseover_handler*/ ctx[13]),
    					listen(svg, "mouseenter", /*mouseenter_handler*/ ctx[14]),
    					listen(svg, "mouseleave", /*mouseleave_handler*/ ctx[15]),
    					listen(svg, "keyup", /*keyup_handler*/ ctx[16]),
    					listen(svg, "keydown", /*keydown_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*title*/ 4) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "data-carbon-icon": "CaretRight16" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 32 32" },
    				{ fill: "currentColor" },
    				{ width: "16" },
    				{ height: "16" },
    				(!current || dirty & /*className*/ 1) && { class: /*className*/ ctx[0] },
    				{ preserveAspectRatio: "xMidYMid meet" },
    				(!current || dirty & /*style*/ 8) && { style: /*style*/ ctx[3] },
    				(!current || dirty & /*id*/ 2) && { id: /*id*/ ctx[1] },
    				dirty & /*attributes*/ 16 && /*attributes*/ ctx[4]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$z($$self, $$props, $$invalidate) {
    	let ariaLabel;
    	let ariaLabelledBy;
    	let labelled;
    	let attributes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { tabindex = undefined } = $$props;
    	let { focusable = false } = $$props;
    	let { title = undefined } = $$props;
    	let { style = undefined } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(18, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("class" in $$new_props) $$invalidate(0, className = $$new_props.class);
    		if ("id" in $$new_props) $$invalidate(1, id = $$new_props.id);
    		if ("tabindex" in $$new_props) $$invalidate(5, tabindex = $$new_props.tabindex);
    		if ("focusable" in $$new_props) $$invalidate(6, focusable = $$new_props.focusable);
    		if ("title" in $$new_props) $$invalidate(2, title = $$new_props.title);
    		if ("style" in $$new_props) $$invalidate(3, style = $$new_props.style);
    		if ("$$scope" in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		$$invalidate(7, ariaLabel = $$props["aria-label"]);
    		$$invalidate(8, ariaLabelledBy = $$props["aria-labelledby"]);

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, title*/ 388) {
    			$$invalidate(9, labelled = ariaLabel || ariaLabelledBy || title);
    		}

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, labelled, tabindex, focusable*/ 992) {
    			$$invalidate(4, attributes = {
    				"aria-label": ariaLabel,
    				"aria-labelledby": ariaLabelledBy,
    				"aria-hidden": labelled ? undefined : true,
    				role: labelled ? "img" : undefined,
    				focusable: tabindex === "0" ? true : focusable,
    				tabindex
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		className,
    		id,
    		title,
    		style,
    		attributes,
    		tabindex,
    		focusable,
    		ariaLabel,
    		ariaLabelledBy,
    		labelled,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		keyup_handler,
    		keydown_handler
    	];
    }

    class CaretRight16 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$z, create_fragment$z, safe_not_equal, {
    			class: 0,
    			id: 1,
    			tabindex: 5,
    			focusable: 6,
    			title: 2,
    			style: 3
    		});
    	}
    }

    /* node_modules/carbon-icons-svelte/lib/WarningFilled16/WarningFilled16.svelte generated by Svelte v3.38.2 */

    function create_if_block$m(ctx) {
    	let title_1;
    	let t;

    	return {
    		c() {
    			title_1 = svg_element("title");
    			t = text(/*title*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, title_1, anchor);
    			append(title_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 4) set_data(t, /*title*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(title_1);
    		}
    	};
    }

    // (38:8)      
    function fallback_block$a(ctx) {
    	let if_block_anchor;
    	let if_block = /*title*/ ctx[2] && create_if_block$m(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$m(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$y(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	const default_slot_or_fallback = default_slot || fallback_block$a(ctx);

    	let svg_levels = [
    		{ "data-carbon-icon": "WarningFilled16" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 16 16" },
    		{ fill: "currentColor" },
    		{ width: "16" },
    		{ height: "16" },
    		{ class: /*className*/ ctx[0] },
    		{ preserveAspectRatio: "xMidYMid meet" },
    		{ style: /*style*/ ctx[3] },
    		{ id: /*id*/ ctx[1] },
    		/*attributes*/ ctx[4]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	return {
    		c() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr(path0, "d", "M8,1C4.2,1,1,4.2,1,8s3.2,7,7,7s7-3.1,7-7S11.9,1,8,1z M7.5,4h1v5h-1C7.5,9,7.5,4,7.5,4z M8,12.2\tc-0.4,0-0.8-0.4-0.8-0.8s0.3-0.8,0.8-0.8c0.4,0,0.8,0.4,0.8,0.8S8.4,12.2,8,12.2z");
    			attr(path1, "d", "M7.5,4h1v5h-1C7.5,9,7.5,4,7.5,4z M8,12.2c-0.4,0-0.8-0.4-0.8-0.8s0.3-0.8,0.8-0.8\tc0.4,0,0.8,0.4,0.8,0.8S8.4,12.2,8,12.2z");
    			attr(path1, "data-icon-path", "inner-path");
    			attr(path1, "opacity", "0");
    			set_svg_attributes(svg, svg_data);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path0);
    			append(svg, path1);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(svg, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(svg, "click", /*click_handler*/ ctx[12]),
    					listen(svg, "mouseover", /*mouseover_handler*/ ctx[13]),
    					listen(svg, "mouseenter", /*mouseenter_handler*/ ctx[14]),
    					listen(svg, "mouseleave", /*mouseleave_handler*/ ctx[15]),
    					listen(svg, "keyup", /*keyup_handler*/ ctx[16]),
    					listen(svg, "keydown", /*keydown_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*title*/ 4) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "data-carbon-icon": "WarningFilled16" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 16 16" },
    				{ fill: "currentColor" },
    				{ width: "16" },
    				{ height: "16" },
    				(!current || dirty & /*className*/ 1) && { class: /*className*/ ctx[0] },
    				{ preserveAspectRatio: "xMidYMid meet" },
    				(!current || dirty & /*style*/ 8) && { style: /*style*/ ctx[3] },
    				(!current || dirty & /*id*/ 2) && { id: /*id*/ ctx[1] },
    				dirty & /*attributes*/ 16 && /*attributes*/ ctx[4]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$y($$self, $$props, $$invalidate) {
    	let ariaLabel;
    	let ariaLabelledBy;
    	let labelled;
    	let attributes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { tabindex = undefined } = $$props;
    	let { focusable = false } = $$props;
    	let { title = undefined } = $$props;
    	let { style = undefined } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(18, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("class" in $$new_props) $$invalidate(0, className = $$new_props.class);
    		if ("id" in $$new_props) $$invalidate(1, id = $$new_props.id);
    		if ("tabindex" in $$new_props) $$invalidate(5, tabindex = $$new_props.tabindex);
    		if ("focusable" in $$new_props) $$invalidate(6, focusable = $$new_props.focusable);
    		if ("title" in $$new_props) $$invalidate(2, title = $$new_props.title);
    		if ("style" in $$new_props) $$invalidate(3, style = $$new_props.style);
    		if ("$$scope" in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		$$invalidate(7, ariaLabel = $$props["aria-label"]);
    		$$invalidate(8, ariaLabelledBy = $$props["aria-labelledby"]);

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, title*/ 388) {
    			$$invalidate(9, labelled = ariaLabel || ariaLabelledBy || title);
    		}

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, labelled, tabindex, focusable*/ 992) {
    			$$invalidate(4, attributes = {
    				"aria-label": ariaLabel,
    				"aria-labelledby": ariaLabelledBy,
    				"aria-hidden": labelled ? undefined : true,
    				role: labelled ? "img" : undefined,
    				focusable: tabindex === "0" ? true : focusable,
    				tabindex
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		className,
    		id,
    		title,
    		style,
    		attributes,
    		tabindex,
    		focusable,
    		ariaLabel,
    		ariaLabelledBy,
    		labelled,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		keyup_handler,
    		keydown_handler
    	];
    }

    class WarningFilled16 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$y, create_fragment$y, safe_not_equal, {
    			class: 0,
    			id: 1,
    			tabindex: 5,
    			focusable: 6,
    			title: 2,
    			style: 3
    		});
    	}
    }

    /* node_modules/carbon-icons-svelte/lib/WarningAltFilled16/WarningAltFilled16.svelte generated by Svelte v3.38.2 */

    function create_if_block$l(ctx) {
    	let title_1;
    	let t;

    	return {
    		c() {
    			title_1 = svg_element("title");
    			t = text(/*title*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, title_1, anchor);
    			append(title_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 4) set_data(t, /*title*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(title_1);
    		}
    	};
    }

    // (38:8)      
    function fallback_block$9(ctx) {
    	let if_block_anchor;
    	let if_block = /*title*/ ctx[2] && create_if_block$l(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$l(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$x(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	const default_slot_or_fallback = default_slot || fallback_block$9(ctx);

    	let svg_levels = [
    		{ "data-carbon-icon": "WarningAltFilled16" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 32 32" },
    		{ fill: "currentColor" },
    		{ width: "16" },
    		{ height: "16" },
    		{ class: /*className*/ ctx[0] },
    		{ preserveAspectRatio: "xMidYMid meet" },
    		{ style: /*style*/ ctx[3] },
    		{ id: /*id*/ ctx[1] },
    		/*attributes*/ ctx[4]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	return {
    		c() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr(path0, "fill", "none");
    			attr(path0, "d", "M14.875,11h2.25V21h-2.25ZM16,27a1.5,1.5,0,1,1,1.5-1.5A1.5,1.5,0,0,1,16,27Z");
    			attr(path1, "d", "M29.8872,28.5386l-13-25a1,1,0,0,0-1.7744,0l-13,25A1,1,0,0,0,3,30H29a1,1,0,0,0,.8872-1.4614ZM14.875,11h2.25V21h-2.25ZM16,27a1.5,1.5,0,1,1,1.5-1.5A1.5,1.5,0,0,1,16,27Z");
    			set_svg_attributes(svg, svg_data);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path0);
    			append(svg, path1);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(svg, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(svg, "click", /*click_handler*/ ctx[12]),
    					listen(svg, "mouseover", /*mouseover_handler*/ ctx[13]),
    					listen(svg, "mouseenter", /*mouseenter_handler*/ ctx[14]),
    					listen(svg, "mouseleave", /*mouseleave_handler*/ ctx[15]),
    					listen(svg, "keyup", /*keyup_handler*/ ctx[16]),
    					listen(svg, "keydown", /*keydown_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*title*/ 4) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "data-carbon-icon": "WarningAltFilled16" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 32 32" },
    				{ fill: "currentColor" },
    				{ width: "16" },
    				{ height: "16" },
    				(!current || dirty & /*className*/ 1) && { class: /*className*/ ctx[0] },
    				{ preserveAspectRatio: "xMidYMid meet" },
    				(!current || dirty & /*style*/ 8) && { style: /*style*/ ctx[3] },
    				(!current || dirty & /*id*/ 2) && { id: /*id*/ ctx[1] },
    				dirty & /*attributes*/ 16 && /*attributes*/ ctx[4]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$x($$self, $$props, $$invalidate) {
    	let ariaLabel;
    	let ariaLabelledBy;
    	let labelled;
    	let attributes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { tabindex = undefined } = $$props;
    	let { focusable = false } = $$props;
    	let { title = undefined } = $$props;
    	let { style = undefined } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(18, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("class" in $$new_props) $$invalidate(0, className = $$new_props.class);
    		if ("id" in $$new_props) $$invalidate(1, id = $$new_props.id);
    		if ("tabindex" in $$new_props) $$invalidate(5, tabindex = $$new_props.tabindex);
    		if ("focusable" in $$new_props) $$invalidate(6, focusable = $$new_props.focusable);
    		if ("title" in $$new_props) $$invalidate(2, title = $$new_props.title);
    		if ("style" in $$new_props) $$invalidate(3, style = $$new_props.style);
    		if ("$$scope" in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		$$invalidate(7, ariaLabel = $$props["aria-label"]);
    		$$invalidate(8, ariaLabelledBy = $$props["aria-labelledby"]);

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, title*/ 388) {
    			$$invalidate(9, labelled = ariaLabel || ariaLabelledBy || title);
    		}

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, labelled, tabindex, focusable*/ 992) {
    			$$invalidate(4, attributes = {
    				"aria-label": ariaLabel,
    				"aria-labelledby": ariaLabelledBy,
    				"aria-hidden": labelled ? undefined : true,
    				role: labelled ? "img" : undefined,
    				focusable: tabindex === "0" ? true : focusable,
    				tabindex
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		className,
    		id,
    		title,
    		style,
    		attributes,
    		tabindex,
    		focusable,
    		ariaLabel,
    		ariaLabelledBy,
    		labelled,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		keyup_handler,
    		keydown_handler
    	];
    }

    class WarningAltFilled16 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$x, create_fragment$x, safe_not_equal, {
    			class: 0,
    			id: 1,
    			tabindex: 5,
    			focusable: 6,
    			title: 2,
    			style: 3
    		});
    	}
    }

    /* node_modules/carbon-icons-svelte/lib/ChevronDown16/ChevronDown16.svelte generated by Svelte v3.38.2 */

    function create_if_block$k(ctx) {
    	let title_1;
    	let t;

    	return {
    		c() {
    			title_1 = svg_element("title");
    			t = text(/*title*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, title_1, anchor);
    			append(title_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 4) set_data(t, /*title*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(title_1);
    		}
    	};
    }

    // (38:8)      
    function fallback_block$8(ctx) {
    	let if_block_anchor;
    	let if_block = /*title*/ ctx[2] && create_if_block$k(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$k(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$w(ctx) {
    	let svg;
    	let path;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	const default_slot_or_fallback = default_slot || fallback_block$8(ctx);

    	let svg_levels = [
    		{ "data-carbon-icon": "ChevronDown16" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 16 16" },
    		{ fill: "currentColor" },
    		{ width: "16" },
    		{ height: "16" },
    		{ class: /*className*/ ctx[0] },
    		{ preserveAspectRatio: "xMidYMid meet" },
    		{ style: /*style*/ ctx[3] },
    		{ id: /*id*/ ctx[1] },
    		/*attributes*/ ctx[4]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr(path, "d", "M8 11L3 6 3.7 5.3 8 9.6 12.3 5.3 13 6z");
    			set_svg_attributes(svg, svg_data);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(svg, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(svg, "click", /*click_handler*/ ctx[12]),
    					listen(svg, "mouseover", /*mouseover_handler*/ ctx[13]),
    					listen(svg, "mouseenter", /*mouseenter_handler*/ ctx[14]),
    					listen(svg, "mouseleave", /*mouseleave_handler*/ ctx[15]),
    					listen(svg, "keyup", /*keyup_handler*/ ctx[16]),
    					listen(svg, "keydown", /*keydown_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*title*/ 4) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "data-carbon-icon": "ChevronDown16" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 16 16" },
    				{ fill: "currentColor" },
    				{ width: "16" },
    				{ height: "16" },
    				(!current || dirty & /*className*/ 1) && { class: /*className*/ ctx[0] },
    				{ preserveAspectRatio: "xMidYMid meet" },
    				(!current || dirty & /*style*/ 8) && { style: /*style*/ ctx[3] },
    				(!current || dirty & /*id*/ 2) && { id: /*id*/ ctx[1] },
    				dirty & /*attributes*/ 16 && /*attributes*/ ctx[4]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$w($$self, $$props, $$invalidate) {
    	let ariaLabel;
    	let ariaLabelledBy;
    	let labelled;
    	let attributes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { tabindex = undefined } = $$props;
    	let { focusable = false } = $$props;
    	let { title = undefined } = $$props;
    	let { style = undefined } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(18, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("class" in $$new_props) $$invalidate(0, className = $$new_props.class);
    		if ("id" in $$new_props) $$invalidate(1, id = $$new_props.id);
    		if ("tabindex" in $$new_props) $$invalidate(5, tabindex = $$new_props.tabindex);
    		if ("focusable" in $$new_props) $$invalidate(6, focusable = $$new_props.focusable);
    		if ("title" in $$new_props) $$invalidate(2, title = $$new_props.title);
    		if ("style" in $$new_props) $$invalidate(3, style = $$new_props.style);
    		if ("$$scope" in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		$$invalidate(7, ariaLabel = $$props["aria-label"]);
    		$$invalidate(8, ariaLabelledBy = $$props["aria-labelledby"]);

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, title*/ 388) {
    			$$invalidate(9, labelled = ariaLabel || ariaLabelledBy || title);
    		}

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, labelled, tabindex, focusable*/ 992) {
    			$$invalidate(4, attributes = {
    				"aria-label": ariaLabel,
    				"aria-labelledby": ariaLabelledBy,
    				"aria-hidden": labelled ? undefined : true,
    				role: labelled ? "img" : undefined,
    				focusable: tabindex === "0" ? true : focusable,
    				tabindex
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		className,
    		id,
    		title,
    		style,
    		attributes,
    		tabindex,
    		focusable,
    		ariaLabel,
    		ariaLabelledBy,
    		labelled,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		keyup_handler,
    		keydown_handler
    	];
    }

    class ChevronDown16 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$w, create_fragment$w, safe_not_equal, {
    			class: 0,
    			id: 1,
    			tabindex: 5,
    			focusable: 6,
    			title: 2,
    			style: 3
    		});
    	}
    }

    /* node_modules/carbon-icons-svelte/lib/Close16/Close16.svelte generated by Svelte v3.38.2 */

    function create_if_block$j(ctx) {
    	let title_1;
    	let t;

    	return {
    		c() {
    			title_1 = svg_element("title");
    			t = text(/*title*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, title_1, anchor);
    			append(title_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 4) set_data(t, /*title*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(title_1);
    		}
    	};
    }

    // (38:8)      
    function fallback_block$7(ctx) {
    	let if_block_anchor;
    	let if_block = /*title*/ ctx[2] && create_if_block$j(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$j(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$v(ctx) {
    	let svg;
    	let path;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	const default_slot_or_fallback = default_slot || fallback_block$7(ctx);

    	let svg_levels = [
    		{ "data-carbon-icon": "Close16" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 32 32" },
    		{ fill: "currentColor" },
    		{ width: "16" },
    		{ height: "16" },
    		{ class: /*className*/ ctx[0] },
    		{ preserveAspectRatio: "xMidYMid meet" },
    		{ style: /*style*/ ctx[3] },
    		{ id: /*id*/ ctx[1] },
    		/*attributes*/ ctx[4]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr(path, "d", "M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6 17.4 16 24 9.4z");
    			set_svg_attributes(svg, svg_data);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(svg, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(svg, "click", /*click_handler*/ ctx[12]),
    					listen(svg, "mouseover", /*mouseover_handler*/ ctx[13]),
    					listen(svg, "mouseenter", /*mouseenter_handler*/ ctx[14]),
    					listen(svg, "mouseleave", /*mouseleave_handler*/ ctx[15]),
    					listen(svg, "keyup", /*keyup_handler*/ ctx[16]),
    					listen(svg, "keydown", /*keydown_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*title*/ 4) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "data-carbon-icon": "Close16" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 32 32" },
    				{ fill: "currentColor" },
    				{ width: "16" },
    				{ height: "16" },
    				(!current || dirty & /*className*/ 1) && { class: /*className*/ ctx[0] },
    				{ preserveAspectRatio: "xMidYMid meet" },
    				(!current || dirty & /*style*/ 8) && { style: /*style*/ ctx[3] },
    				(!current || dirty & /*id*/ 2) && { id: /*id*/ ctx[1] },
    				dirty & /*attributes*/ 16 && /*attributes*/ ctx[4]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$v($$self, $$props, $$invalidate) {
    	let ariaLabel;
    	let ariaLabelledBy;
    	let labelled;
    	let attributes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { tabindex = undefined } = $$props;
    	let { focusable = false } = $$props;
    	let { title = undefined } = $$props;
    	let { style = undefined } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(18, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("class" in $$new_props) $$invalidate(0, className = $$new_props.class);
    		if ("id" in $$new_props) $$invalidate(1, id = $$new_props.id);
    		if ("tabindex" in $$new_props) $$invalidate(5, tabindex = $$new_props.tabindex);
    		if ("focusable" in $$new_props) $$invalidate(6, focusable = $$new_props.focusable);
    		if ("title" in $$new_props) $$invalidate(2, title = $$new_props.title);
    		if ("style" in $$new_props) $$invalidate(3, style = $$new_props.style);
    		if ("$$scope" in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		$$invalidate(7, ariaLabel = $$props["aria-label"]);
    		$$invalidate(8, ariaLabelledBy = $$props["aria-labelledby"]);

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, title*/ 388) {
    			$$invalidate(9, labelled = ariaLabel || ariaLabelledBy || title);
    		}

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, labelled, tabindex, focusable*/ 992) {
    			$$invalidate(4, attributes = {
    				"aria-label": ariaLabel,
    				"aria-labelledby": ariaLabelledBy,
    				"aria-hidden": labelled ? undefined : true,
    				role: labelled ? "img" : undefined,
    				focusable: tabindex === "0" ? true : focusable,
    				tabindex
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		className,
    		id,
    		title,
    		style,
    		attributes,
    		tabindex,
    		focusable,
    		ariaLabel,
    		ariaLabelledBy,
    		labelled,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		keyup_handler,
    		keydown_handler
    	];
    }

    class Close16 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$v, create_fragment$v, safe_not_equal, {
    			class: 0,
    			id: 1,
    			tabindex: 5,
    			focusable: 6,
    			title: 2,
    			style: 3
    		});
    	}
    }

    /* node_modules/carbon-icons-svelte/lib/Close20/Close20.svelte generated by Svelte v3.38.2 */

    function create_if_block$i(ctx) {
    	let title_1;
    	let t;

    	return {
    		c() {
    			title_1 = svg_element("title");
    			t = text(/*title*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, title_1, anchor);
    			append(title_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 4) set_data(t, /*title*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(title_1);
    		}
    	};
    }

    // (38:8)      
    function fallback_block$6(ctx) {
    	let if_block_anchor;
    	let if_block = /*title*/ ctx[2] && create_if_block$i(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$i(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$u(ctx) {
    	let svg;
    	let path;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	const default_slot_or_fallback = default_slot || fallback_block$6(ctx);

    	let svg_levels = [
    		{ "data-carbon-icon": "Close20" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 32 32" },
    		{ fill: "currentColor" },
    		{ width: "20" },
    		{ height: "20" },
    		{ class: /*className*/ ctx[0] },
    		{ preserveAspectRatio: "xMidYMid meet" },
    		{ style: /*style*/ ctx[3] },
    		{ id: /*id*/ ctx[1] },
    		/*attributes*/ ctx[4]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr(path, "d", "M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6 17.4 16 24 9.4z");
    			set_svg_attributes(svg, svg_data);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(svg, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(svg, "click", /*click_handler*/ ctx[12]),
    					listen(svg, "mouseover", /*mouseover_handler*/ ctx[13]),
    					listen(svg, "mouseenter", /*mouseenter_handler*/ ctx[14]),
    					listen(svg, "mouseleave", /*mouseleave_handler*/ ctx[15]),
    					listen(svg, "keyup", /*keyup_handler*/ ctx[16]),
    					listen(svg, "keydown", /*keydown_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*title*/ 4) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "data-carbon-icon": "Close20" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 32 32" },
    				{ fill: "currentColor" },
    				{ width: "20" },
    				{ height: "20" },
    				(!current || dirty & /*className*/ 1) && { class: /*className*/ ctx[0] },
    				{ preserveAspectRatio: "xMidYMid meet" },
    				(!current || dirty & /*style*/ 8) && { style: /*style*/ ctx[3] },
    				(!current || dirty & /*id*/ 2) && { id: /*id*/ ctx[1] },
    				dirty & /*attributes*/ 16 && /*attributes*/ ctx[4]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$u($$self, $$props, $$invalidate) {
    	let ariaLabel;
    	let ariaLabelledBy;
    	let labelled;
    	let attributes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { tabindex = undefined } = $$props;
    	let { focusable = false } = $$props;
    	let { title = undefined } = $$props;
    	let { style = undefined } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(18, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("class" in $$new_props) $$invalidate(0, className = $$new_props.class);
    		if ("id" in $$new_props) $$invalidate(1, id = $$new_props.id);
    		if ("tabindex" in $$new_props) $$invalidate(5, tabindex = $$new_props.tabindex);
    		if ("focusable" in $$new_props) $$invalidate(6, focusable = $$new_props.focusable);
    		if ("title" in $$new_props) $$invalidate(2, title = $$new_props.title);
    		if ("style" in $$new_props) $$invalidate(3, style = $$new_props.style);
    		if ("$$scope" in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		$$invalidate(7, ariaLabel = $$props["aria-label"]);
    		$$invalidate(8, ariaLabelledBy = $$props["aria-labelledby"]);

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, title*/ 388) {
    			$$invalidate(9, labelled = ariaLabel || ariaLabelledBy || title);
    		}

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, labelled, tabindex, focusable*/ 992) {
    			$$invalidate(4, attributes = {
    				"aria-label": ariaLabel,
    				"aria-labelledby": ariaLabelledBy,
    				"aria-hidden": labelled ? undefined : true,
    				role: labelled ? "img" : undefined,
    				focusable: tabindex === "0" ? true : focusable,
    				tabindex
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		className,
    		id,
    		title,
    		style,
    		attributes,
    		tabindex,
    		focusable,
    		ariaLabel,
    		ariaLabelledBy,
    		labelled,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		keyup_handler,
    		keydown_handler
    	];
    }

    class Close20 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$u, create_fragment$u, safe_not_equal, {
    			class: 0,
    			id: 1,
    			tabindex: 5,
    			focusable: 6,
    			title: 2,
    			style: 3
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/RadioButton/RadioButton.svelte generated by Svelte v3.38.2 */

    function create_if_block$h(ctx) {
    	let span;
    	let t;

    	return {
    		c() {
    			span = element("span");
    			t = text(/*labelText*/ ctx[5]);
    			toggle_class(span, "bx--visually-hidden", /*hideLabel*/ ctx[6]);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*labelText*/ 32) set_data(t, /*labelText*/ ctx[5]);

    			if (dirty & /*hideLabel*/ 64) {
    				toggle_class(span, "bx--visually-hidden", /*hideLabel*/ ctx[6]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    function create_fragment$t(ctx) {
    	let div;
    	let input;
    	let t0;
    	let label;
    	let span;
    	let t1;
    	let mounted;
    	let dispose;
    	let if_block = /*labelText*/ ctx[5] && create_if_block$h(ctx);
    	let div_levels = [/*$$restProps*/ ctx[11]];
    	let div_data = {};

    	for (let i = 0; i < div_levels.length; i += 1) {
    		div_data = assign(div_data, div_levels[i]);
    	}

    	return {
    		c() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			span = element("span");
    			t1 = space();
    			if (if_block) if_block.c();
    			attr(input, "type", "radio");
    			attr(input, "id", /*id*/ ctx[7]);
    			attr(input, "name", /*name*/ ctx[8]);
    			input.checked = /*checked*/ ctx[0];
    			input.disabled = /*disabled*/ ctx[3];
    			input.value = /*value*/ ctx[2];
    			toggle_class(input, "bx--radio-button", true);
    			toggle_class(span, "bx--radio-button__appearance", true);
    			attr(label, "for", /*id*/ ctx[7]);
    			toggle_class(label, "bx--radio-button__label", true);
    			set_attributes(div, div_data);
    			toggle_class(div, "bx--radio-button-wrapper", true);
    			toggle_class(div, "bx--radio-button-wrapper--label-left", /*labelPosition*/ ctx[4] === "left");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);
    			/*input_binding*/ ctx[14](input);
    			append(div, t0);
    			append(div, label);
    			append(label, span);
    			append(label, t1);
    			if (if_block) if_block.m(label, null);

    			if (!mounted) {
    				dispose = [
    					listen(input, "change", /*change_handler*/ ctx[13]),
    					listen(input, "change", /*change_handler_1*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*id*/ 128) {
    				attr(input, "id", /*id*/ ctx[7]);
    			}

    			if (dirty & /*name*/ 256) {
    				attr(input, "name", /*name*/ ctx[8]);
    			}

    			if (dirty & /*checked*/ 1) {
    				input.checked = /*checked*/ ctx[0];
    			}

    			if (dirty & /*disabled*/ 8) {
    				input.disabled = /*disabled*/ ctx[3];
    			}

    			if (dirty & /*value*/ 4) {
    				input.value = /*value*/ ctx[2];
    			}

    			if (/*labelText*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$h(ctx);
    					if_block.c();
    					if_block.m(label, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*id*/ 128) {
    				attr(label, "for", /*id*/ ctx[7]);
    			}

    			set_attributes(div, div_data = get_spread_update(div_levels, [dirty & /*$$restProps*/ 2048 && /*$$restProps*/ ctx[11]]));
    			toggle_class(div, "bx--radio-button-wrapper", true);
    			toggle_class(div, "bx--radio-button-wrapper--label-left", /*labelPosition*/ ctx[4] === "left");
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			/*input_binding*/ ctx[14](null);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$t($$self, $$props, $$invalidate) {
    	const omit_props_names = [
    		"value","checked","disabled","labelPosition","labelText","hideLabel","id","name","ref"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let $selectedValue;
    	let { value = "" } = $$props;
    	let { checked = false } = $$props;
    	let { disabled = false } = $$props;
    	let { labelPosition = "right" } = $$props;
    	let { labelText = "" } = $$props;
    	let { hideLabel = false } = $$props;
    	let { id = "ccs-" + Math.random().toString(36) } = $$props;
    	let { name = "" } = $$props;
    	let { ref = null } = $$props;
    	const ctx = getContext("RadioButtonGroup");

    	const selectedValue = ctx
    	? ctx.selectedValue
    	: writable(checked ? value : undefined);

    	component_subscribe($$self, selectedValue, value => $$invalidate(12, $selectedValue = value));

    	if (ctx) {
    		ctx.add({ id, checked, disabled, value });
    	}

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			ref = $$value;
    			$$invalidate(1, ref);
    		});
    	}

    	const change_handler_1 = () => {
    		if (ctx) {
    			ctx.update(value);
    		}
    	};

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(11, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("value" in $$new_props) $$invalidate(2, value = $$new_props.value);
    		if ("checked" in $$new_props) $$invalidate(0, checked = $$new_props.checked);
    		if ("disabled" in $$new_props) $$invalidate(3, disabled = $$new_props.disabled);
    		if ("labelPosition" in $$new_props) $$invalidate(4, labelPosition = $$new_props.labelPosition);
    		if ("labelText" in $$new_props) $$invalidate(5, labelText = $$new_props.labelText);
    		if ("hideLabel" in $$new_props) $$invalidate(6, hideLabel = $$new_props.hideLabel);
    		if ("id" in $$new_props) $$invalidate(7, id = $$new_props.id);
    		if ("name" in $$new_props) $$invalidate(8, name = $$new_props.name);
    		if ("ref" in $$new_props) $$invalidate(1, ref = $$new_props.ref);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$selectedValue, value*/ 4100) {
    			$$invalidate(0, checked = $selectedValue === value);
    		}
    	};

    	return [
    		checked,
    		ref,
    		value,
    		disabled,
    		labelPosition,
    		labelText,
    		hideLabel,
    		id,
    		name,
    		ctx,
    		selectedValue,
    		$$restProps,
    		$selectedValue,
    		change_handler,
    		input_binding,
    		change_handler_1
    	];
    }

    class RadioButton extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$t, create_fragment$t, safe_not_equal, {
    			value: 2,
    			checked: 0,
    			disabled: 3,
    			labelPosition: 4,
    			labelText: 5,
    			hideLabel: 6,
    			id: 7,
    			name: 8,
    			ref: 1
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/DataTable/Table.svelte generated by Svelte v3.38.2 */

    function create_else_block$8(ctx) {
    	let table;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);
    	let table_levels = [/*$$restProps*/ ctx[6]];
    	let table_data = {};

    	for (let i = 0; i < table_levels.length; i += 1) {
    		table_data = assign(table_data, table_levels[i]);
    	}

    	return {
    		c() {
    			table = element("table");
    			if (default_slot) default_slot.c();
    			set_attributes(table, table_data);
    			toggle_class(table, "bx--data-table", true);
    			toggle_class(table, "bx--data-table--compact", /*size*/ ctx[0] === "compact");
    			toggle_class(table, "bx--data-table--short", /*size*/ ctx[0] === "short");
    			toggle_class(table, "bx--data-table--tall", /*size*/ ctx[0] === "tall");
    			toggle_class(table, "bx--data-table--sort", /*sortable*/ ctx[4]);
    			toggle_class(table, "bx--data-table--zebra", /*zebra*/ ctx[1]);
    			toggle_class(table, "bx--data-table--static", /*useStaticWidth*/ ctx[2]);
    			toggle_class(table, "bx--data-table--no-border", !/*shouldShowBorder*/ ctx[3]);
    			toggle_class(table, "bx--data-table--sticky-header", /*stickyHeader*/ ctx[5]);
    		},
    		m(target, anchor) {
    			insert(target, table, anchor);

    			if (default_slot) {
    				default_slot.m(table, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 128)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[7], dirty, null, null);
    				}
    			}

    			set_attributes(table, table_data = get_spread_update(table_levels, [dirty & /*$$restProps*/ 64 && /*$$restProps*/ ctx[6]]));
    			toggle_class(table, "bx--data-table", true);
    			toggle_class(table, "bx--data-table--compact", /*size*/ ctx[0] === "compact");
    			toggle_class(table, "bx--data-table--short", /*size*/ ctx[0] === "short");
    			toggle_class(table, "bx--data-table--tall", /*size*/ ctx[0] === "tall");
    			toggle_class(table, "bx--data-table--sort", /*sortable*/ ctx[4]);
    			toggle_class(table, "bx--data-table--zebra", /*zebra*/ ctx[1]);
    			toggle_class(table, "bx--data-table--static", /*useStaticWidth*/ ctx[2]);
    			toggle_class(table, "bx--data-table--no-border", !/*shouldShowBorder*/ ctx[3]);
    			toggle_class(table, "bx--data-table--sticky-header", /*stickyHeader*/ ctx[5]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(table);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (24:0) {#if stickyHeader}
    function create_if_block$g(ctx) {
    	let section;
    	let table;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);
    	let section_levels = [/*$$restProps*/ ctx[6]];
    	let section_data = {};

    	for (let i = 0; i < section_levels.length; i += 1) {
    		section_data = assign(section_data, section_levels[i]);
    	}

    	return {
    		c() {
    			section = element("section");
    			table = element("table");
    			if (default_slot) default_slot.c();
    			toggle_class(table, "bx--data-table", true);
    			toggle_class(table, "bx--data-table--compact", /*size*/ ctx[0] === "compact");
    			toggle_class(table, "bx--data-table--short", /*size*/ ctx[0] === "short");
    			toggle_class(table, "bx--data-table--tall", /*size*/ ctx[0] === "tall");
    			toggle_class(table, "bx--data-table--sort", /*sortable*/ ctx[4]);
    			toggle_class(table, "bx--data-table--zebra", /*zebra*/ ctx[1]);
    			toggle_class(table, "bx--data-table--static", /*useStaticWidth*/ ctx[2]);
    			toggle_class(table, "bx--data-table--no-border", !/*shouldShowBorder*/ ctx[3]);
    			toggle_class(table, "bx--data-table--sticky-header", /*stickyHeader*/ ctx[5]);
    			set_attributes(section, section_data);
    			toggle_class(section, "bx--data-table_inner-container", true);
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, table);

    			if (default_slot) {
    				default_slot.m(table, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 128)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[7], dirty, null, null);
    				}
    			}

    			if (dirty & /*size*/ 1) {
    				toggle_class(table, "bx--data-table--compact", /*size*/ ctx[0] === "compact");
    			}

    			if (dirty & /*size*/ 1) {
    				toggle_class(table, "bx--data-table--short", /*size*/ ctx[0] === "short");
    			}

    			if (dirty & /*size*/ 1) {
    				toggle_class(table, "bx--data-table--tall", /*size*/ ctx[0] === "tall");
    			}

    			if (dirty & /*sortable*/ 16) {
    				toggle_class(table, "bx--data-table--sort", /*sortable*/ ctx[4]);
    			}

    			if (dirty & /*zebra*/ 2) {
    				toggle_class(table, "bx--data-table--zebra", /*zebra*/ ctx[1]);
    			}

    			if (dirty & /*useStaticWidth*/ 4) {
    				toggle_class(table, "bx--data-table--static", /*useStaticWidth*/ ctx[2]);
    			}

    			if (dirty & /*shouldShowBorder*/ 8) {
    				toggle_class(table, "bx--data-table--no-border", !/*shouldShowBorder*/ ctx[3]);
    			}

    			if (dirty & /*stickyHeader*/ 32) {
    				toggle_class(table, "bx--data-table--sticky-header", /*stickyHeader*/ ctx[5]);
    			}

    			set_attributes(section, section_data = get_spread_update(section_levels, [dirty & /*$$restProps*/ 64 && /*$$restProps*/ ctx[6]]));
    			toggle_class(section, "bx--data-table_inner-container", true);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$s(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$g, create_else_block$8];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*stickyHeader*/ ctx[5]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$s($$self, $$props, $$invalidate) {
    	const omit_props_names = ["size","zebra","useStaticWidth","shouldShowBorder","sortable","stickyHeader"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { size = undefined } = $$props;
    	let { zebra = false } = $$props;
    	let { useStaticWidth = false } = $$props;
    	let { shouldShowBorder = false } = $$props;
    	let { sortable = false } = $$props;
    	let { stickyHeader = false } = $$props;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(6, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("size" in $$new_props) $$invalidate(0, size = $$new_props.size);
    		if ("zebra" in $$new_props) $$invalidate(1, zebra = $$new_props.zebra);
    		if ("useStaticWidth" in $$new_props) $$invalidate(2, useStaticWidth = $$new_props.useStaticWidth);
    		if ("shouldShowBorder" in $$new_props) $$invalidate(3, shouldShowBorder = $$new_props.shouldShowBorder);
    		if ("sortable" in $$new_props) $$invalidate(4, sortable = $$new_props.sortable);
    		if ("stickyHeader" in $$new_props) $$invalidate(5, stickyHeader = $$new_props.stickyHeader);
    		if ("$$scope" in $$new_props) $$invalidate(7, $$scope = $$new_props.$$scope);
    	};

    	return [
    		size,
    		zebra,
    		useStaticWidth,
    		shouldShowBorder,
    		sortable,
    		stickyHeader,
    		$$restProps,
    		$$scope,
    		slots
    	];
    }

    class Table extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$s, create_fragment$s, safe_not_equal, {
    			size: 0,
    			zebra: 1,
    			useStaticWidth: 2,
    			shouldShowBorder: 3,
    			sortable: 4,
    			stickyHeader: 5
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/DataTable/TableBody.svelte generated by Svelte v3.38.2 */

    function create_fragment$r(ctx) {
    	let tbody;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);
    	let tbody_levels = [{ "aria-live": "polite" }, /*$$restProps*/ ctx[0]];
    	let tbody_data = {};

    	for (let i = 0; i < tbody_levels.length; i += 1) {
    		tbody_data = assign(tbody_data, tbody_levels[i]);
    	}

    	return {
    		c() {
    			tbody = element("tbody");
    			if (default_slot) default_slot.c();
    			set_attributes(tbody, tbody_data);
    		},
    		m(target, anchor) {
    			insert(target, tbody, anchor);

    			if (default_slot) {
    				default_slot.m(tbody, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			set_attributes(tbody, tbody_data = get_spread_update(tbody_levels, [
    				{ "aria-live": "polite" },
    				dirty & /*$$restProps*/ 1 && /*$$restProps*/ ctx[0]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tbody);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$r($$self, $$props, $$invalidate) {
    	const omit_props_names = [];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(0, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("$$scope" in $$new_props) $$invalidate(1, $$scope = $$new_props.$$scope);
    	};

    	return [$$restProps, $$scope, slots];
    }

    class TableBody extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$r, create_fragment$r, safe_not_equal, {});
    	}
    }

    /* node_modules/carbon-components-svelte/src/DataTable/TableCell.svelte generated by Svelte v3.38.2 */

    function create_fragment$q(ctx) {
    	let td;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);
    	let td_levels = [/*$$restProps*/ ctx[0]];
    	let td_data = {};

    	for (let i = 0; i < td_levels.length; i += 1) {
    		td_data = assign(td_data, td_levels[i]);
    	}

    	return {
    		c() {
    			td = element("td");
    			if (default_slot) default_slot.c();
    			set_attributes(td, td_data);
    		},
    		m(target, anchor) {
    			insert(target, td, anchor);

    			if (default_slot) {
    				default_slot.m(td, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(td, "click", /*click_handler*/ ctx[3]),
    					listen(td, "mouseover", /*mouseover_handler*/ ctx[4]),
    					listen(td, "mouseenter", /*mouseenter_handler*/ ctx[5]),
    					listen(td, "mouseleave", /*mouseleave_handler*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			set_attributes(td, td_data = get_spread_update(td_levels, [dirty & /*$$restProps*/ 1 && /*$$restProps*/ ctx[0]]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(td);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$q($$self, $$props, $$invalidate) {
    	const omit_props_names = [];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(0, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("$$scope" in $$new_props) $$invalidate(1, $$scope = $$new_props.$$scope);
    	};

    	return [
    		$$restProps,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler
    	];
    }

    class TableCell extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$q, create_fragment$q, safe_not_equal, {});
    	}
    }

    /* node_modules/carbon-components-svelte/src/DataTable/TableContainer.svelte generated by Svelte v3.38.2 */

    function create_if_block$f(ctx) {
    	let div;
    	let h4;
    	let t0;
    	let t1;
    	let p;
    	let t2;

    	return {
    		c() {
    			div = element("div");
    			h4 = element("h4");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = space();
    			p = element("p");
    			t2 = text(/*description*/ ctx[1]);
    			toggle_class(h4, "bx--data-table-header__title", true);
    			toggle_class(p, "bx--data-table-header__description", true);
    			toggle_class(div, "bx--data-table-header", true);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h4);
    			append(h4, t0);
    			append(div, t1);
    			append(div, p);
    			append(p, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data(t0, /*title*/ ctx[0]);
    			if (dirty & /*description*/ 2) set_data(t2, /*description*/ ctx[1]);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$p(ctx) {
    	let div;
    	let t;
    	let current;
    	let if_block = /*title*/ ctx[0] && create_if_block$f(ctx);
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
    	let div_levels = [/*$$restProps*/ ctx[3]];
    	let div_data = {};

    	for (let i = 0; i < div_levels.length; i += 1) {
    		div_data = assign(div_data, div_levels[i]);
    	}

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			if (default_slot) default_slot.c();
    			set_attributes(div, div_data);
    			toggle_class(div, "bx--data-table-container", true);
    			toggle_class(div, "bx--data-table--max-width", /*stickyHeader*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append(div, t);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*title*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$f(ctx);
    					if_block.c();
    					if_block.m(div, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}

    			set_attributes(div, div_data = get_spread_update(div_levels, [dirty & /*$$restProps*/ 8 && /*$$restProps*/ ctx[3]]));
    			toggle_class(div, "bx--data-table-container", true);
    			toggle_class(div, "bx--data-table--max-width", /*stickyHeader*/ ctx[2]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$p($$self, $$props, $$invalidate) {
    	const omit_props_names = ["title","description","stickyHeader"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { title = "" } = $$props;
    	let { description = "" } = $$props;
    	let { stickyHeader = false } = $$props;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(3, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("title" in $$new_props) $$invalidate(0, title = $$new_props.title);
    		if ("description" in $$new_props) $$invalidate(1, description = $$new_props.description);
    		if ("stickyHeader" in $$new_props) $$invalidate(2, stickyHeader = $$new_props.stickyHeader);
    		if ("$$scope" in $$new_props) $$invalidate(4, $$scope = $$new_props.$$scope);
    	};

    	return [title, description, stickyHeader, $$restProps, $$scope, slots];
    }

    class TableContainer extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$p, create_fragment$p, safe_not_equal, {
    			title: 0,
    			description: 1,
    			stickyHeader: 2
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/DataTable/TableHead.svelte generated by Svelte v3.38.2 */

    function create_fragment$o(ctx) {
    	let thead;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);
    	let thead_levels = [/*$$restProps*/ ctx[0]];
    	let thead_data = {};

    	for (let i = 0; i < thead_levels.length; i += 1) {
    		thead_data = assign(thead_data, thead_levels[i]);
    	}

    	return {
    		c() {
    			thead = element("thead");
    			if (default_slot) default_slot.c();
    			set_attributes(thead, thead_data);
    		},
    		m(target, anchor) {
    			insert(target, thead, anchor);

    			if (default_slot) {
    				default_slot.m(thead, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(thead, "click", /*click_handler*/ ctx[3]),
    					listen(thead, "mouseover", /*mouseover_handler*/ ctx[4]),
    					listen(thead, "mouseenter", /*mouseenter_handler*/ ctx[5]),
    					listen(thead, "mouseleave", /*mouseleave_handler*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			set_attributes(thead, thead_data = get_spread_update(thead_levels, [dirty & /*$$restProps*/ 1 && /*$$restProps*/ ctx[0]]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(thead);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$o($$self, $$props, $$invalidate) {
    	const omit_props_names = [];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(0, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("$$scope" in $$new_props) $$invalidate(1, $$scope = $$new_props.$$scope);
    	};

    	return [
    		$$restProps,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler
    	];
    }

    class TableHead extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {});
    	}
    }

    /* node_modules/carbon-icons-svelte/lib/ArrowUp20/ArrowUp20.svelte generated by Svelte v3.38.2 */

    function create_if_block$e(ctx) {
    	let title_1;
    	let t;

    	return {
    		c() {
    			title_1 = svg_element("title");
    			t = text(/*title*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, title_1, anchor);
    			append(title_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 4) set_data(t, /*title*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(title_1);
    		}
    	};
    }

    // (38:8)      
    function fallback_block$5(ctx) {
    	let if_block_anchor;
    	let if_block = /*title*/ ctx[2] && create_if_block$e(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$e(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$n(ctx) {
    	let svg;
    	let path;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	const default_slot_or_fallback = default_slot || fallback_block$5(ctx);

    	let svg_levels = [
    		{ "data-carbon-icon": "ArrowUp20" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 32 32" },
    		{ fill: "currentColor" },
    		{ width: "20" },
    		{ height: "20" },
    		{ class: /*className*/ ctx[0] },
    		{ preserveAspectRatio: "xMidYMid meet" },
    		{ style: /*style*/ ctx[3] },
    		{ id: /*id*/ ctx[1] },
    		/*attributes*/ ctx[4]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr(path, "d", "M16 4L6 14 7.41 15.41 15 7.83 15 28 17 28 17 7.83 24.59 15.41 26 14 16 4z");
    			set_svg_attributes(svg, svg_data);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(svg, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(svg, "click", /*click_handler*/ ctx[12]),
    					listen(svg, "mouseover", /*mouseover_handler*/ ctx[13]),
    					listen(svg, "mouseenter", /*mouseenter_handler*/ ctx[14]),
    					listen(svg, "mouseleave", /*mouseleave_handler*/ ctx[15]),
    					listen(svg, "keyup", /*keyup_handler*/ ctx[16]),
    					listen(svg, "keydown", /*keydown_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*title*/ 4) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "data-carbon-icon": "ArrowUp20" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 32 32" },
    				{ fill: "currentColor" },
    				{ width: "20" },
    				{ height: "20" },
    				(!current || dirty & /*className*/ 1) && { class: /*className*/ ctx[0] },
    				{ preserveAspectRatio: "xMidYMid meet" },
    				(!current || dirty & /*style*/ 8) && { style: /*style*/ ctx[3] },
    				(!current || dirty & /*id*/ 2) && { id: /*id*/ ctx[1] },
    				dirty & /*attributes*/ 16 && /*attributes*/ ctx[4]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$n($$self, $$props, $$invalidate) {
    	let ariaLabel;
    	let ariaLabelledBy;
    	let labelled;
    	let attributes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { tabindex = undefined } = $$props;
    	let { focusable = false } = $$props;
    	let { title = undefined } = $$props;
    	let { style = undefined } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(18, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("class" in $$new_props) $$invalidate(0, className = $$new_props.class);
    		if ("id" in $$new_props) $$invalidate(1, id = $$new_props.id);
    		if ("tabindex" in $$new_props) $$invalidate(5, tabindex = $$new_props.tabindex);
    		if ("focusable" in $$new_props) $$invalidate(6, focusable = $$new_props.focusable);
    		if ("title" in $$new_props) $$invalidate(2, title = $$new_props.title);
    		if ("style" in $$new_props) $$invalidate(3, style = $$new_props.style);
    		if ("$$scope" in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		$$invalidate(7, ariaLabel = $$props["aria-label"]);
    		$$invalidate(8, ariaLabelledBy = $$props["aria-labelledby"]);

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, title*/ 388) {
    			$$invalidate(9, labelled = ariaLabel || ariaLabelledBy || title);
    		}

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, labelled, tabindex, focusable*/ 992) {
    			$$invalidate(4, attributes = {
    				"aria-label": ariaLabel,
    				"aria-labelledby": ariaLabelledBy,
    				"aria-hidden": labelled ? undefined : true,
    				role: labelled ? "img" : undefined,
    				focusable: tabindex === "0" ? true : focusable,
    				tabindex
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		className,
    		id,
    		title,
    		style,
    		attributes,
    		tabindex,
    		focusable,
    		ariaLabel,
    		ariaLabelledBy,
    		labelled,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		keyup_handler,
    		keydown_handler
    	];
    }

    class ArrowUp20 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$n, create_fragment$n, safe_not_equal, {
    			class: 0,
    			id: 1,
    			tabindex: 5,
    			focusable: 6,
    			title: 2,
    			style: 3
    		});
    	}
    }

    /* node_modules/carbon-icons-svelte/lib/ArrowsVertical20/ArrowsVertical20.svelte generated by Svelte v3.38.2 */

    function create_if_block$d(ctx) {
    	let title_1;
    	let t;

    	return {
    		c() {
    			title_1 = svg_element("title");
    			t = text(/*title*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, title_1, anchor);
    			append(title_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 4) set_data(t, /*title*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(title_1);
    		}
    	};
    }

    // (38:8)      
    function fallback_block$4(ctx) {
    	let if_block_anchor;
    	let if_block = /*title*/ ctx[2] && create_if_block$d(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$d(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$m(ctx) {
    	let svg;
    	let path;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	const default_slot_or_fallback = default_slot || fallback_block$4(ctx);

    	let svg_levels = [
    		{ "data-carbon-icon": "ArrowsVertical20" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 32 32" },
    		{ fill: "currentColor" },
    		{ width: "20" },
    		{ height: "20" },
    		{ class: /*className*/ ctx[0] },
    		{ preserveAspectRatio: "xMidYMid meet" },
    		{ style: /*style*/ ctx[3] },
    		{ id: /*id*/ ctx[1] },
    		/*attributes*/ ctx[4]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr(path, "d", "M27.6 20.6L24 24.2 24 4 22 4 22 24.2 18.4 20.6 17 22 23 28 29 22zM9 4L3 10 4.4 11.4 8 7.8 8 28 10 28 10 7.8 13.6 11.4 15 10z");
    			set_svg_attributes(svg, svg_data);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(svg, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(svg, "click", /*click_handler*/ ctx[12]),
    					listen(svg, "mouseover", /*mouseover_handler*/ ctx[13]),
    					listen(svg, "mouseenter", /*mouseenter_handler*/ ctx[14]),
    					listen(svg, "mouseleave", /*mouseleave_handler*/ ctx[15]),
    					listen(svg, "keyup", /*keyup_handler*/ ctx[16]),
    					listen(svg, "keydown", /*keydown_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*title*/ 4) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "data-carbon-icon": "ArrowsVertical20" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 32 32" },
    				{ fill: "currentColor" },
    				{ width: "20" },
    				{ height: "20" },
    				(!current || dirty & /*className*/ 1) && { class: /*className*/ ctx[0] },
    				{ preserveAspectRatio: "xMidYMid meet" },
    				(!current || dirty & /*style*/ 8) && { style: /*style*/ ctx[3] },
    				(!current || dirty & /*id*/ 2) && { id: /*id*/ ctx[1] },
    				dirty & /*attributes*/ 16 && /*attributes*/ ctx[4]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$m($$self, $$props, $$invalidate) {
    	let ariaLabel;
    	let ariaLabelledBy;
    	let labelled;
    	let attributes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { tabindex = undefined } = $$props;
    	let { focusable = false } = $$props;
    	let { title = undefined } = $$props;
    	let { style = undefined } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(18, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("class" in $$new_props) $$invalidate(0, className = $$new_props.class);
    		if ("id" in $$new_props) $$invalidate(1, id = $$new_props.id);
    		if ("tabindex" in $$new_props) $$invalidate(5, tabindex = $$new_props.tabindex);
    		if ("focusable" in $$new_props) $$invalidate(6, focusable = $$new_props.focusable);
    		if ("title" in $$new_props) $$invalidate(2, title = $$new_props.title);
    		if ("style" in $$new_props) $$invalidate(3, style = $$new_props.style);
    		if ("$$scope" in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		$$invalidate(7, ariaLabel = $$props["aria-label"]);
    		$$invalidate(8, ariaLabelledBy = $$props["aria-labelledby"]);

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, title*/ 388) {
    			$$invalidate(9, labelled = ariaLabel || ariaLabelledBy || title);
    		}

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, labelled, tabindex, focusable*/ 992) {
    			$$invalidate(4, attributes = {
    				"aria-label": ariaLabel,
    				"aria-labelledby": ariaLabelledBy,
    				"aria-hidden": labelled ? undefined : true,
    				role: labelled ? "img" : undefined,
    				focusable: tabindex === "0" ? true : focusable,
    				tabindex
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		className,
    		id,
    		title,
    		style,
    		attributes,
    		tabindex,
    		focusable,
    		ariaLabel,
    		ariaLabelledBy,
    		labelled,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		keyup_handler,
    		keydown_handler
    	];
    }

    class ArrowsVertical20 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$m, create_fragment$m, safe_not_equal, {
    			class: 0,
    			id: 1,
    			tabindex: 5,
    			focusable: 6,
    			title: 2,
    			style: 3
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/DataTable/TableHeader.svelte generated by Svelte v3.38.2 */

    function create_else_block$7(ctx) {
    	let th;
    	let div;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[12].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[11], null);
    	let th_levels = [{ scope: /*scope*/ ctx[1] }, { id: /*id*/ ctx[2] }, /*$$restProps*/ ctx[9]];
    	let th_data = {};

    	for (let i = 0; i < th_levels.length; i += 1) {
    		th_data = assign(th_data, th_levels[i]);
    	}

    	return {
    		c() {
    			th = element("th");
    			div = element("div");
    			if (default_slot) default_slot.c();
    			toggle_class(div, "bx--table-header-label", true);
    			set_attributes(th, th_data);
    		},
    		m(target, anchor) {
    			insert(target, th, anchor);
    			append(th, div);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(th, "click", /*click_handler_1*/ ctx[17]),
    					listen(th, "mouseover", /*mouseover_handler_1*/ ctx[18]),
    					listen(th, "mouseenter", /*mouseenter_handler_1*/ ctx[19]),
    					listen(th, "mouseleave", /*mouseleave_handler_1*/ ctx[20])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2048)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[11], dirty, null, null);
    				}
    			}

    			set_attributes(th, th_data = get_spread_update(th_levels, [
    				(!current || dirty & /*scope*/ 2) && { scope: /*scope*/ ctx[1] },
    				(!current || dirty & /*id*/ 4) && { id: /*id*/ ctx[2] },
    				dirty & /*$$restProps*/ 512 && /*$$restProps*/ ctx[9]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(th);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (30:0) {#if $tableSortable && !disableSorting}
    function create_if_block$c(ctx) {
    	let th;
    	let button;
    	let div;
    	let t0;
    	let arrowup20;
    	let t1;
    	let arrowsvertical20;
    	let th_aria_sort_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[12].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[11], null);

    	arrowup20 = new ArrowUp20({
    			props: {
    				"aria-label": /*ariaLabel*/ ctx[5],
    				class: "bx--table-sort__icon"
    			}
    		});

    	arrowsvertical20 = new ArrowsVertical20({
    			props: {
    				"aria-label": /*ariaLabel*/ ctx[5],
    				class: "bx--table-sort__icon-unsorted"
    			}
    		});

    	let th_levels = [
    		{
    			"aria-sort": th_aria_sort_value = /*active*/ ctx[4]
    			? /*$sortHeader*/ ctx[3].sortDirection
    			: "none"
    		},
    		{ scope: /*scope*/ ctx[1] },
    		{ id: /*id*/ ctx[2] },
    		/*$$restProps*/ ctx[9]
    	];

    	let th_data = {};

    	for (let i = 0; i < th_levels.length; i += 1) {
    		th_data = assign(th_data, th_levels[i]);
    	}

    	return {
    		c() {
    			th = element("th");
    			button = element("button");
    			div = element("div");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			create_component(arrowup20.$$.fragment);
    			t1 = space();
    			create_component(arrowsvertical20.$$.fragment);
    			toggle_class(div, "bx--table-header-label", true);
    			toggle_class(button, "bx--table-sort", true);
    			toggle_class(button, "bx--table-sort--active", /*active*/ ctx[4]);
    			toggle_class(button, "bx--table-sort--ascending", /*active*/ ctx[4] && /*$sortHeader*/ ctx[3].sortDirection === "descending");
    			set_attributes(th, th_data);
    		},
    		m(target, anchor) {
    			insert(target, th, anchor);
    			append(th, button);
    			append(button, div);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			append(button, t0);
    			mount_component(arrowup20, button, null);
    			append(button, t1);
    			mount_component(arrowsvertical20, button, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button, "click", /*click_handler*/ ctx[16]),
    					listen(th, "mouseover", /*mouseover_handler*/ ctx[13]),
    					listen(th, "mouseenter", /*mouseenter_handler*/ ctx[14]),
    					listen(th, "mouseleave", /*mouseleave_handler*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2048)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[11], dirty, null, null);
    				}
    			}

    			const arrowup20_changes = {};
    			if (dirty & /*ariaLabel*/ 32) arrowup20_changes["aria-label"] = /*ariaLabel*/ ctx[5];
    			arrowup20.$set(arrowup20_changes);
    			const arrowsvertical20_changes = {};
    			if (dirty & /*ariaLabel*/ 32) arrowsvertical20_changes["aria-label"] = /*ariaLabel*/ ctx[5];
    			arrowsvertical20.$set(arrowsvertical20_changes);

    			if (dirty & /*active*/ 16) {
    				toggle_class(button, "bx--table-sort--active", /*active*/ ctx[4]);
    			}

    			if (dirty & /*active, $sortHeader*/ 24) {
    				toggle_class(button, "bx--table-sort--ascending", /*active*/ ctx[4] && /*$sortHeader*/ ctx[3].sortDirection === "descending");
    			}

    			set_attributes(th, th_data = get_spread_update(th_levels, [
    				(!current || dirty & /*active, $sortHeader*/ 24 && th_aria_sort_value !== (th_aria_sort_value = /*active*/ ctx[4]
    				? /*$sortHeader*/ ctx[3].sortDirection
    				: "none")) && { "aria-sort": th_aria_sort_value },
    				(!current || dirty & /*scope*/ 2) && { scope: /*scope*/ ctx[1] },
    				(!current || dirty & /*id*/ 4) && { id: /*id*/ ctx[2] },
    				dirty & /*$$restProps*/ 512 && /*$$restProps*/ ctx[9]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(arrowup20.$$.fragment, local);
    			transition_in(arrowsvertical20.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(arrowup20.$$.fragment, local);
    			transition_out(arrowsvertical20.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(th);
    			if (default_slot) default_slot.d(detaching);
    			destroy_component(arrowup20);
    			destroy_component(arrowsvertical20);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$l(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$c, create_else_block$7];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$tableSortable*/ ctx[6] && !/*disableSorting*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let active;
    	let ariaLabel;
    	const omit_props_names = ["disableSorting","scope","translateWithId","id"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let $sortHeader;
    	let $tableSortable;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { disableSorting = false } = $$props;
    	let { scope = "col" } = $$props;
    	let { translateWithId = () => "" } = $$props;
    	let { id = "ccs-" + Math.random().toString(36) } = $$props;
    	const { sortHeader, tableSortable, add } = getContext("DataTable");
    	component_subscribe($$self, sortHeader, value => $$invalidate(3, $sortHeader = value));
    	component_subscribe($$self, tableSortable, value => $$invalidate(6, $tableSortable = value));
    	add(id);

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function click_handler_1(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler_1(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler_1(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(9, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("disableSorting" in $$new_props) $$invalidate(0, disableSorting = $$new_props.disableSorting);
    		if ("scope" in $$new_props) $$invalidate(1, scope = $$new_props.scope);
    		if ("translateWithId" in $$new_props) $$invalidate(10, translateWithId = $$new_props.translateWithId);
    		if ("id" in $$new_props) $$invalidate(2, id = $$new_props.id);
    		if ("$$scope" in $$new_props) $$invalidate(11, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$sortHeader, id*/ 12) {
    			$$invalidate(4, active = $sortHeader.id === id);
    		}

    		if ($$self.$$.dirty & /*translateWithId*/ 1024) {
    			// TODO: translate with id
    			$$invalidate(5, ariaLabel = translateWithId());
    		}
    	};

    	return [
    		disableSorting,
    		scope,
    		id,
    		$sortHeader,
    		active,
    		ariaLabel,
    		$tableSortable,
    		sortHeader,
    		tableSortable,
    		$$restProps,
    		translateWithId,
    		$$scope,
    		slots,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		click_handler,
    		click_handler_1,
    		mouseover_handler_1,
    		mouseenter_handler_1,
    		mouseleave_handler_1
    	];
    }

    class TableHeader extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {
    			disableSorting: 0,
    			scope: 1,
    			translateWithId: 10,
    			id: 2
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/DataTable/TableRow.svelte generated by Svelte v3.38.2 */

    function create_fragment$k(ctx) {
    	let tr;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);
    	let tr_levels = [/*$$restProps*/ ctx[0]];
    	let tr_data = {};

    	for (let i = 0; i < tr_levels.length; i += 1) {
    		tr_data = assign(tr_data, tr_levels[i]);
    	}

    	return {
    		c() {
    			tr = element("tr");
    			if (default_slot) default_slot.c();
    			set_attributes(tr, tr_data);
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);

    			if (default_slot) {
    				default_slot.m(tr, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(tr, "click", /*click_handler*/ ctx[3]),
    					listen(tr, "mouseover", /*mouseover_handler*/ ctx[4]),
    					listen(tr, "mouseenter", /*mouseenter_handler*/ ctx[5]),
    					listen(tr, "mouseleave", /*mouseleave_handler*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			set_attributes(tr, tr_data = get_spread_update(tr_levels, [dirty & /*$$restProps*/ 1 && /*$$restProps*/ ctx[0]]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$k($$self, $$props, $$invalidate) {
    	const omit_props_names = [];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(0, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("$$scope" in $$new_props) $$invalidate(1, $$scope = $$new_props.$$scope);
    	};

    	return [
    		$$restProps,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler
    	];
    }

    class TableRow extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {});
    	}
    }

    /* node_modules/carbon-components-svelte/src/DataTable/DataTable.svelte generated by Svelte v3.38.2 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[53] = list[i];
    	child_ctx[55] = i;
    	return child_ctx;
    }

    const get_expanded_row_slot_changes = dirty => ({
    	row: dirty[0] & /*sorting, sortedRows, rows*/ 8454145
    });

    const get_expanded_row_slot_context = ctx => ({ row: /*row*/ ctx[53] });

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[56] = list[i];
    	child_ctx[58] = i;
    	return child_ctx;
    }

    const get_cell_slot_changes_1 = dirty => ({
    	row: dirty[0] & /*sorting, sortedRows, rows*/ 8454145,
    	cell: dirty[0] & /*sorting, sortedRows, rows*/ 8454145
    });

    const get_cell_slot_context_1 = ctx => ({
    	row: /*row*/ ctx[53],
    	cell: /*cell*/ ctx[56]
    });

    const get_cell_slot_changes = dirty => ({
    	row: dirty[0] & /*sorting, sortedRows, rows*/ 8454145,
    	cell: dirty[0] & /*sorting, sortedRows, rows*/ 8454145
    });

    const get_cell_slot_context = ctx => ({
    	row: /*row*/ ctx[53],
    	cell: /*cell*/ ctx[56]
    });

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[59] = list[i];
    	child_ctx[55] = i;
    	return child_ctx;
    }

    const get_cell_header_slot_changes = dirty => ({ header: dirty[0] & /*headers*/ 32 });
    const get_cell_header_slot_context = ctx => ({ header: /*header*/ ctx[59] });

    // (215:8) {#if expandable}
    function create_if_block_8$1(ctx) {
    	let th;
    	let th_data_previous_value_value;
    	let current;
    	let if_block = /*batchExpansion*/ ctx[11] && create_if_block_9$1(ctx);

    	return {
    		c() {
    			th = element("th");
    			if (if_block) if_block.c();
    			attr(th, "scope", "col");
    			attr(th, "data-previous-value", th_data_previous_value_value = /*expanded*/ ctx[17] ? "collapsed" : undefined);
    			toggle_class(th, "bx--table-expand", true);
    		},
    		m(target, anchor) {
    			insert(target, th, anchor);
    			if (if_block) if_block.m(th, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*batchExpansion*/ ctx[11]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*batchExpansion*/ 2048) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_9$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(th, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty[0] & /*expanded*/ 131072 && th_data_previous_value_value !== (th_data_previous_value_value = /*expanded*/ ctx[17] ? "collapsed" : undefined)) {
    				attr(th, "data-previous-value", th_data_previous_value_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(th);
    			if (if_block) if_block.d();
    		}
    	};
    }

    // (221:12) {#if batchExpansion}
    function create_if_block_9$1(ctx) {
    	let button;
    	let chevronright16;
    	let current;
    	let mounted;
    	let dispose;

    	chevronright16 = new ChevronRight16({
    			props: { class: "bx--table-expand__svg" }
    		});

    	return {
    		c() {
    			button = element("button");
    			create_component(chevronright16.$$.fragment);
    			attr(button, "type", "button");
    			toggle_class(button, "bx--table-expand__button", true);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			mount_component(chevronright16, button, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler*/ ctx[35]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(chevronright16.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(chevronright16.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			destroy_component(chevronright16);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (237:8) {#if selectable && !batchSelection}
    function create_if_block_7$1(ctx) {
    	let th;

    	return {
    		c() {
    			th = element("th");
    			attr(th, "scope", "col");
    		},
    		m(target, anchor) {
    			insert(target, th, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(th);
    		}
    	};
    }

    // (240:8) {#if batchSelection && !radio}
    function create_if_block_6$2(ctx) {
    	let th;
    	let inlinecheckbox;
    	let updating_ref;
    	let current;

    	function inlinecheckbox_ref_binding(value) {
    		/*inlinecheckbox_ref_binding*/ ctx[36](value);
    	}

    	let inlinecheckbox_props = {
    		"aria-label": "Select all rows",
    		checked: /*selectAll*/ ctx[19],
    		indeterminate: /*indeterminate*/ ctx[22]
    	};

    	if (/*refSelectAll*/ ctx[20] !== void 0) {
    		inlinecheckbox_props.ref = /*refSelectAll*/ ctx[20];
    	}

    	inlinecheckbox = new InlineCheckbox({ props: inlinecheckbox_props });
    	binding_callbacks.push(() => bind(inlinecheckbox, "ref", inlinecheckbox_ref_binding));
    	inlinecheckbox.$on("change", /*change_handler*/ ctx[37]);

    	return {
    		c() {
    			th = element("th");
    			create_component(inlinecheckbox.$$.fragment);
    			attr(th, "scope", "col");
    			toggle_class(th, "bx--table-column-checkbox", true);
    		},
    		m(target, anchor) {
    			insert(target, th, anchor);
    			mount_component(inlinecheckbox, th, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const inlinecheckbox_changes = {};
    			if (dirty[0] & /*selectAll*/ 524288) inlinecheckbox_changes.checked = /*selectAll*/ ctx[19];
    			if (dirty[0] & /*indeterminate*/ 4194304) inlinecheckbox_changes.indeterminate = /*indeterminate*/ ctx[22];

    			if (!updating_ref && dirty[0] & /*refSelectAll*/ 1048576) {
    				updating_ref = true;
    				inlinecheckbox_changes.ref = /*refSelectAll*/ ctx[20];
    				add_flush_callback(() => updating_ref = false);
    			}

    			inlinecheckbox.$set(inlinecheckbox_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(inlinecheckbox.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(inlinecheckbox.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(th);
    			destroy_component(inlinecheckbox);
    		}
    	};
    }

    // (267:10) {:else}
    function create_else_block_2(ctx) {
    	let tableheader;
    	let current;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[38](/*header*/ ctx[59]);
    	}

    	tableheader = new TableHeader({
    			props: {
    				disableSorting: /*header*/ ctx[59].sort === false,
    				$$slots: { default: [create_default_slot_9] },
    				$$scope: { ctx }
    			}
    		});

    	tableheader.$on("click", click_handler_1);

    	return {
    		c() {
    			create_component(tableheader.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tableheader, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const tableheader_changes = {};
    			if (dirty[0] & /*headers*/ 32) tableheader_changes.disableSorting = /*header*/ ctx[59].sort === false;

    			if (dirty[0] & /*headers*/ 32 | dirty[1] & /*$$scope*/ 131072) {
    				tableheader_changes.$$scope = { dirty, ctx };
    			}

    			tableheader.$set(tableheader_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tableheader.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tableheader.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tableheader, detaching);
    		}
    	};
    }

    // (265:10) {#if header.empty}
    function create_if_block_5$2(ctx) {
    	let th;

    	return {
    		c() {
    			th = element("th");
    			attr(th, "scope", "col");
    		},
    		m(target, anchor) {
    			insert(target, th, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(th);
    		}
    	};
    }

    // (291:57) {header.value}
    function fallback_block_2(ctx) {
    	let t_value = /*header*/ ctx[59].value + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*headers*/ 32 && t_value !== (t_value = /*header*/ ctx[59].value + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (268:12) <TableHeader               disableSorting="{header.sort === false}"               on:click="{() => {                 dispatch('click', { header });                  if (header.sort === false) {                   dispatch('click:header', { header });                 } else {                   let active = header.key === $sortHeader.key;                   let currentSortDirection = active                     ? $sortHeader.sortDirection                     : 'none';                   let sortDirection = sortDirectionMap[currentSortDirection];                   dispatch('click:header', { header, sortDirection });                   sortHeader.set({                     id: sortDirection === 'none' ? null : $thKeys[header.key],                     key: header.key,                     sort: header.sort,                     sortDirection,                   });                 }               }}"             >
    function create_default_slot_9(ctx) {
    	let t;
    	let current;
    	const cell_header_slot_template = /*#slots*/ ctx[34]["cell-header"];
    	const cell_header_slot = create_slot(cell_header_slot_template, ctx, /*$$scope*/ ctx[48], get_cell_header_slot_context);
    	const cell_header_slot_or_fallback = cell_header_slot || fallback_block_2(ctx);

    	return {
    		c() {
    			if (cell_header_slot_or_fallback) cell_header_slot_or_fallback.c();
    			t = space();
    		},
    		m(target, anchor) {
    			if (cell_header_slot_or_fallback) {
    				cell_header_slot_or_fallback.m(target, anchor);
    			}

    			insert(target, t, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (cell_header_slot) {
    				if (cell_header_slot.p && (!current || dirty[0] & /*headers*/ 32 | dirty[1] & /*$$scope*/ 131072)) {
    					update_slot(cell_header_slot, cell_header_slot_template, ctx, /*$$scope*/ ctx[48], dirty, get_cell_header_slot_changes, get_cell_header_slot_context);
    				}
    			} else {
    				if (cell_header_slot_or_fallback && cell_header_slot_or_fallback.p && dirty[0] & /*headers*/ 32) {
    					cell_header_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(cell_header_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(cell_header_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (cell_header_slot_or_fallback) cell_header_slot_or_fallback.d(detaching);
    			if (detaching) detach(t);
    		}
    	};
    }

    // (264:8) {#each headers as header, i (header.key)}
    function create_each_block_2(key_1, ctx) {
    	let first;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_5$2, create_else_block_2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*header*/ ctx[59].empty) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			if_block.c();
    			if_block_anchor = empty();
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (214:6) <TableRow>
    function create_default_slot_8(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let current;
    	let if_block0 = /*expandable*/ ctx[3] && create_if_block_8$1(ctx);
    	let if_block1 = /*selectable*/ ctx[4] && !/*batchSelection*/ ctx[13] && create_if_block_7$1();
    	let if_block2 = /*batchSelection*/ ctx[13] && !/*radio*/ ctx[12] && create_if_block_6$2(ctx);
    	let each_value_2 = /*headers*/ ctx[5];
    	const get_key = ctx => /*header*/ ctx[59].key;

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_2(key, child_ctx));
    	}

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, t2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*expandable*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*expandable*/ 8) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_8$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*selectable*/ ctx[4] && !/*batchSelection*/ ctx[13]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_7$1();
    					if_block1.c();
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*batchSelection*/ ctx[13] && !/*radio*/ ctx[12]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*batchSelection, radio*/ 12288) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_6$2(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(t2.parentNode, t2);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (dirty[0] & /*headers, dispatch, $sortHeader, sortDirectionMap, sortHeader, $thKeys*/ 251691040 | dirty[1] & /*$$scope*/ 131072) {
    				each_value_2 = /*headers*/ ctx[5];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_2, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block_2, each_1_anchor, get_each_context_2);
    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block2);

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(t2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (213:4) <TableHead>
    function create_default_slot_7(ctx) {
    	let tablerow;
    	let current;

    	tablerow = new TableRow({
    			props: {
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(tablerow.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tablerow, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tablerow_changes = {};

    			if (dirty[0] & /*headers, $sortHeader, $thKeys, selectAll, indeterminate, refSelectAll, selectedRowIds, rows, batchSelection, radio, selectable, expanded, expandedRowIds, batchExpansion, expandable*/ 22722623 | dirty[1] & /*$$scope*/ 131072) {
    				tablerow_changes.$$scope = { dirty, ctx };
    			}

    			tablerow.$set(tablerow_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tablerow.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tablerow.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tablerow, detaching);
    		}
    	};
    }

    // (319:10) {#if expandable}
    function create_if_block_4$3(ctx) {
    	let tablecell;
    	let current;

    	tablecell = new TableCell({
    			props: {
    				class: "bx--table-expand",
    				headers: "expand",
    				"data-previous-value": /*expandedRows*/ ctx[21][/*row*/ ctx[53].id]
    				? "collapsed"
    				: undefined,
    				$$slots: { default: [create_default_slot_6$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(tablecell.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tablecell, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tablecell_changes = {};

    			if (dirty[0] & /*expandedRows, sorting, sortedRows, rows*/ 10551297) tablecell_changes["data-previous-value"] = /*expandedRows*/ ctx[21][/*row*/ ctx[53].id]
    			? "collapsed"
    			: undefined;

    			if (dirty[0] & /*expandedRows, sorting, sortedRows, rows, expandedRowIds*/ 10551299 | dirty[1] & /*$$scope*/ 131072) {
    				tablecell_changes.$$scope = { dirty, ctx };
    			}

    			tablecell.$set(tablecell_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tablecell.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tablecell.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tablecell, detaching);
    		}
    	};
    }

    // (320:12) <TableCell               class="bx--table-expand"               headers="expand"               data-previous-value="{expandedRows[row.id]                 ? 'collapsed'                 : undefined}"             >
    function create_default_slot_6$1(ctx) {
    	let button;
    	let chevronright16;
    	let button_aria_label_value;
    	let current;
    	let mounted;
    	let dispose;

    	chevronright16 = new ChevronRight16({
    			props: { class: "bx--table-expand__svg" }
    		});

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[39](/*row*/ ctx[53]);
    	}

    	return {
    		c() {
    			button = element("button");
    			create_component(chevronright16.$$.fragment);
    			attr(button, "type", "button");

    			attr(button, "aria-label", button_aria_label_value = /*expandedRows*/ ctx[21][/*row*/ ctx[53].id]
    			? "Collapse current row"
    			: "Expand current row");

    			toggle_class(button, "bx--table-expand__button", true);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			mount_component(chevronright16, button, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", click_handler_2);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (!current || dirty[0] & /*expandedRows, sorting, sortedRows, rows*/ 10551297 && button_aria_label_value !== (button_aria_label_value = /*expandedRows*/ ctx[21][/*row*/ ctx[53].id]
    			? "Collapse current row"
    			: "Expand current row")) {
    				attr(button, "aria-label", button_aria_label_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(chevronright16.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(chevronright16.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			destroy_component(chevronright16);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (350:10) {#if selectable}
    function create_if_block_2$4(ctx) {
    	let td;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block_3$4, create_else_block_1$1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*radio*/ ctx[12]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			td = element("td");
    			if_block.c();
    			toggle_class(td, "bx--table-column-checkbox", true);
    			toggle_class(td, "bx--table-column-radio", /*radio*/ ctx[12]);
    		},
    		m(target, anchor) {
    			insert(target, td, anchor);
    			if_blocks[current_block_type_index].m(td, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(td, null);
    			}

    			if (dirty[0] & /*radio*/ 4096) {
    				toggle_class(td, "bx--table-column-radio", /*radio*/ ctx[12]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(td);
    			if_blocks[current_block_type_index].d();
    		}
    	};
    }

    // (363:14) {:else}
    function create_else_block_1$1(ctx) {
    	let inlinecheckbox;
    	let current;

    	function change_handler_2() {
    		return /*change_handler_2*/ ctx[41](/*row*/ ctx[53]);
    	}

    	inlinecheckbox = new InlineCheckbox({
    			props: {
    				name: "select-row-" + /*row*/ ctx[53].id,
    				checked: /*selectedRowIds*/ ctx[2].includes(/*row*/ ctx[53].id)
    			}
    		});

    	inlinecheckbox.$on("change", change_handler_2);

    	return {
    		c() {
    			create_component(inlinecheckbox.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(inlinecheckbox, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const inlinecheckbox_changes = {};
    			if (dirty[0] & /*sorting, sortedRows, rows*/ 8454145) inlinecheckbox_changes.name = "select-row-" + /*row*/ ctx[53].id;
    			if (dirty[0] & /*selectedRowIds, sorting, sortedRows, rows*/ 8454149) inlinecheckbox_changes.checked = /*selectedRowIds*/ ctx[2].includes(/*row*/ ctx[53].id);
    			inlinecheckbox.$set(inlinecheckbox_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(inlinecheckbox.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(inlinecheckbox.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(inlinecheckbox, detaching);
    		}
    	};
    }

    // (355:14) {#if radio}
    function create_if_block_3$4(ctx) {
    	let radiobutton;
    	let current;

    	function change_handler_1() {
    		return /*change_handler_1*/ ctx[40](/*row*/ ctx[53]);
    	}

    	radiobutton = new RadioButton({
    			props: {
    				name: "select-row-" + /*row*/ ctx[53].id,
    				checked: /*selectedRowIds*/ ctx[2].includes(/*row*/ ctx[53].id)
    			}
    		});

    	radiobutton.$on("change", change_handler_1);

    	return {
    		c() {
    			create_component(radiobutton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(radiobutton, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const radiobutton_changes = {};
    			if (dirty[0] & /*sorting, sortedRows, rows*/ 8454145) radiobutton_changes.name = "select-row-" + /*row*/ ctx[53].id;
    			if (dirty[0] & /*selectedRowIds, sorting, sortedRows, rows*/ 8454149) radiobutton_changes.checked = /*selectedRowIds*/ ctx[2].includes(/*row*/ ctx[53].id);
    			radiobutton.$set(radiobutton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(radiobutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(radiobutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(radiobutton, detaching);
    		}
    	};
    }

    // (387:12) {:else}
    function create_else_block$6(ctx) {
    	let tablecell;
    	let current;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[42](/*row*/ ctx[53], /*cell*/ ctx[56]);
    	}

    	tablecell = new TableCell({
    			props: {
    				$$slots: { default: [create_default_slot_5$1] },
    				$$scope: { ctx }
    			}
    		});

    	tablecell.$on("click", click_handler_3);

    	return {
    		c() {
    			create_component(tablecell.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tablecell, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const tablecell_changes = {};

    			if (dirty[0] & /*sorting, sortedRows, rows*/ 8454145 | dirty[1] & /*$$scope*/ 131072) {
    				tablecell_changes.$$scope = { dirty, ctx };
    			}

    			tablecell.$set(tablecell_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tablecell.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tablecell.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tablecell, detaching);
    		}
    	};
    }

    // (381:12) {#if headers[j].empty}
    function create_if_block_1$5(ctx) {
    	let td;
    	let t;
    	let current;
    	const cell_slot_template = /*#slots*/ ctx[34].cell;
    	const cell_slot = create_slot(cell_slot_template, ctx, /*$$scope*/ ctx[48], get_cell_slot_context);
    	const cell_slot_or_fallback = cell_slot || fallback_block$3(ctx);

    	return {
    		c() {
    			td = element("td");
    			if (cell_slot_or_fallback) cell_slot_or_fallback.c();
    			t = space();
    			toggle_class(td, "bx--table-column-menu", /*headers*/ ctx[5][/*j*/ ctx[58]].columnMenu);
    		},
    		m(target, anchor) {
    			insert(target, td, anchor);

    			if (cell_slot_or_fallback) {
    				cell_slot_or_fallback.m(td, null);
    			}

    			append(td, t);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (cell_slot) {
    				if (cell_slot.p && (!current || dirty[0] & /*sorting, sortedRows, rows*/ 8454145 | dirty[1] & /*$$scope*/ 131072)) {
    					update_slot(cell_slot, cell_slot_template, ctx, /*$$scope*/ ctx[48], dirty, get_cell_slot_changes, get_cell_slot_context);
    				}
    			} else {
    				if (cell_slot_or_fallback && cell_slot_or_fallback.p && dirty[0] & /*sorting, sortedRows, rows*/ 8454145) {
    					cell_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			if (dirty[0] & /*headers, sorting, sortedRows, rows*/ 8454177) {
    				toggle_class(td, "bx--table-column-menu", /*headers*/ ctx[5][/*j*/ ctx[58]].columnMenu);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(cell_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(cell_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(td);
    			if (cell_slot_or_fallback) cell_slot_or_fallback.d(detaching);
    		}
    	};
    }

    // (394:60)                    
    function fallback_block_1$1(ctx) {
    	let t_value = (/*cell*/ ctx[56].display
    	? /*cell*/ ctx[56].display(/*cell*/ ctx[56].value)
    	: /*cell*/ ctx[56].value) + "";

    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*sorting, sortedRows, rows*/ 8454145 && t_value !== (t_value = (/*cell*/ ctx[56].display
    			? /*cell*/ ctx[56].display(/*cell*/ ctx[56].value)
    			: /*cell*/ ctx[56].value) + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (388:14) <TableCell                 on:click="{() => {                   dispatch('click', { row, cell });                   dispatch('click:cell', cell);                 }}"               >
    function create_default_slot_5$1(ctx) {
    	let t;
    	let current;
    	const cell_slot_template = /*#slots*/ ctx[34].cell;
    	const cell_slot = create_slot(cell_slot_template, ctx, /*$$scope*/ ctx[48], get_cell_slot_context_1);
    	const cell_slot_or_fallback = cell_slot || fallback_block_1$1(ctx);

    	return {
    		c() {
    			if (cell_slot_or_fallback) cell_slot_or_fallback.c();
    			t = space();
    		},
    		m(target, anchor) {
    			if (cell_slot_or_fallback) {
    				cell_slot_or_fallback.m(target, anchor);
    			}

    			insert(target, t, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (cell_slot) {
    				if (cell_slot.p && (!current || dirty[0] & /*sorting, sortedRows, rows*/ 8454145 | dirty[1] & /*$$scope*/ 131072)) {
    					update_slot(cell_slot, cell_slot_template, ctx, /*$$scope*/ ctx[48], dirty, get_cell_slot_changes_1, get_cell_slot_context_1);
    				}
    			} else {
    				if (cell_slot_or_fallback && cell_slot_or_fallback.p && dirty[0] & /*sorting, sortedRows, rows*/ 8454145) {
    					cell_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(cell_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(cell_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (cell_slot_or_fallback) cell_slot_or_fallback.d(detaching);
    			if (detaching) detach(t);
    		}
    	};
    }

    // (383:60)                    
    function fallback_block$3(ctx) {
    	let t_value = (/*cell*/ ctx[56].display
    	? /*cell*/ ctx[56].display(/*cell*/ ctx[56].value)
    	: /*cell*/ ctx[56].value) + "";

    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*sorting, sortedRows, rows*/ 8454145 && t_value !== (t_value = (/*cell*/ ctx[56].display
    			? /*cell*/ ctx[56].display(/*cell*/ ctx[56].value)
    			: /*cell*/ ctx[56].value) + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (380:10) {#each row.cells as cell, j (cell.key)}
    function create_each_block_1$1(key_1, ctx) {
    	let first;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$5, create_else_block$6];
    	const if_blocks = [];

    	function select_block_type_2(ctx, dirty) {
    		if (/*headers*/ ctx[5][/*j*/ ctx[58]].empty) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_2(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			if_block.c();
    			if_block_anchor = empty();
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_2(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (299:8) <TableRow           id="row-{row.id}"           class="{selectedRowIds.includes(row.id)             ? 'bx--data-table--selected'             : ''} {expandedRows[row.id] ? 'bx--expandable-row' : ''} {expandable             ? 'bx--parent-row'             : ''} {expandable && parentRowId === row.id             ? 'bx--expandable-row--hover'             : ''}"           on:click="{() => {             dispatch('click', { row });             dispatch('click:row', row);           }}"           on:mouseenter="{() => {             dispatch('mouseenter:row', row);           }}"           on:mouseleave="{() => {             dispatch('mouseleave:row', row);           }}"         >
    function create_default_slot_4$1(ctx) {
    	let t0;
    	let t1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let current;
    	let if_block0 = /*expandable*/ ctx[3] && create_if_block_4$3(ctx);
    	let if_block1 = /*selectable*/ ctx[4] && create_if_block_2$4(ctx);
    	let each_value_1 = /*row*/ ctx[53].cells;
    	const get_key = ctx => /*cell*/ ctx[56].key;

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1$1(key, child_ctx));
    	}

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*expandable*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*expandable*/ 8) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_4$3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*selectable*/ ctx[4]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*selectable*/ 16) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2$4(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (dirty[0] & /*headers, sorting, sortedRows, rows, dispatch*/ 75563041 | dirty[1] & /*$$scope*/ 131072) {
    				each_value_1 = /*row*/ ctx[53].cells;
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block_1$1, each_1_anchor, get_each_context_1$1);
    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (402:8) {#if expandable && expandedRows[row.id]}
    function create_if_block$b(ctx) {
    	let tr;
    	let tablecell;
    	let t;
    	let current;
    	let mounted;
    	let dispose;

    	tablecell = new TableCell({
    			props: {
    				colspan: /*selectable*/ ctx[4]
    				? /*headers*/ ctx[5].length + 2
    				: /*headers*/ ctx[5].length + 1,
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			}
    		});

    	function mouseenter_handler_1() {
    		return /*mouseenter_handler_1*/ ctx[46](/*row*/ ctx[53]);
    	}

    	return {
    		c() {
    			tr = element("tr");
    			create_component(tablecell.$$.fragment);
    			t = space();
    			attr(tr, "data-child-row", "");
    			toggle_class(tr, "bx--expandable-row", true);
    		},
    		m(target, anchor) {
    			insert(target, tr, anchor);
    			mount_component(tablecell, tr, null);
    			append(tr, t);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(tr, "mouseenter", mouseenter_handler_1),
    					listen(tr, "mouseleave", /*mouseleave_handler_1*/ ctx[47])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const tablecell_changes = {};

    			if (dirty[0] & /*selectable, headers*/ 48) tablecell_changes.colspan = /*selectable*/ ctx[4]
    			? /*headers*/ ctx[5].length + 2
    			: /*headers*/ ctx[5].length + 1;

    			if (dirty[0] & /*sorting, sortedRows, rows*/ 8454145 | dirty[1] & /*$$scope*/ 131072) {
    				tablecell_changes.$$scope = { dirty, ctx };
    			}

    			tablecell.$set(tablecell_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tablecell.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tablecell.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tr);
    			destroy_component(tablecell);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (413:12) <TableCell               colspan="{selectable ? headers.length + 2 : headers.length + 1}"             >
    function create_default_slot_3$1(ctx) {
    	let div;
    	let current;
    	const expanded_row_slot_template = /*#slots*/ ctx[34]["expanded-row"];
    	const expanded_row_slot = create_slot(expanded_row_slot_template, ctx, /*$$scope*/ ctx[48], get_expanded_row_slot_context);

    	return {
    		c() {
    			div = element("div");
    			if (expanded_row_slot) expanded_row_slot.c();
    			toggle_class(div, "bx--child-row-inner-container", true);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (expanded_row_slot) {
    				expanded_row_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (expanded_row_slot) {
    				if (expanded_row_slot.p && (!current || dirty[0] & /*sorting, sortedRows, rows*/ 8454145 | dirty[1] & /*$$scope*/ 131072)) {
    					update_slot(expanded_row_slot, expanded_row_slot_template, ctx, /*$$scope*/ ctx[48], dirty, get_expanded_row_slot_changes, get_expanded_row_slot_context);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(expanded_row_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(expanded_row_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (expanded_row_slot) expanded_row_slot.d(detaching);
    		}
    	};
    }

    // (298:6) {#each sorting ? sortedRows : rows as row, i (row.id)}
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let tablerow;
    	let t;
    	let if_block_anchor;
    	let current;

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[43](/*row*/ ctx[53]);
    	}

    	function mouseenter_handler() {
    		return /*mouseenter_handler*/ ctx[44](/*row*/ ctx[53]);
    	}

    	function mouseleave_handler() {
    		return /*mouseleave_handler*/ ctx[45](/*row*/ ctx[53]);
    	}

    	tablerow = new TableRow({
    			props: {
    				id: "row-" + /*row*/ ctx[53].id,
    				class: "" + ((/*selectedRowIds*/ ctx[2].includes(/*row*/ ctx[53].id)
    				? "bx--data-table--selected"
    				: "") + " " + (/*expandedRows*/ ctx[21][/*row*/ ctx[53].id]
    				? "bx--expandable-row"
    				: "") + " " + (/*expandable*/ ctx[3] ? "bx--parent-row" : "") + " " + (/*expandable*/ ctx[3] && /*parentRowId*/ ctx[18] === /*row*/ ctx[53].id
    				? "bx--expandable-row--hover"
    				: "")),
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			}
    		});

    	tablerow.$on("click", click_handler_4);
    	tablerow.$on("mouseenter", mouseenter_handler);
    	tablerow.$on("mouseleave", mouseleave_handler);
    	let if_block = /*expandable*/ ctx[3] && /*expandedRows*/ ctx[21][/*row*/ ctx[53].id] && create_if_block$b(ctx);

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			create_component(tablerow.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(tablerow, target, anchor);
    			insert(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const tablerow_changes = {};
    			if (dirty[0] & /*sorting, sortedRows, rows*/ 8454145) tablerow_changes.id = "row-" + /*row*/ ctx[53].id;

    			if (dirty[0] & /*selectedRowIds, sorting, sortedRows, rows, expandedRows, expandable, parentRowId*/ 10813453) tablerow_changes.class = "" + ((/*selectedRowIds*/ ctx[2].includes(/*row*/ ctx[53].id)
    			? "bx--data-table--selected"
    			: "") + " " + (/*expandedRows*/ ctx[21][/*row*/ ctx[53].id]
    			? "bx--expandable-row"
    			: "") + " " + (/*expandable*/ ctx[3] ? "bx--parent-row" : "") + " " + (/*expandable*/ ctx[3] && /*parentRowId*/ ctx[18] === /*row*/ ctx[53].id
    			? "bx--expandable-row--hover"
    			: ""));

    			if (dirty[0] & /*sorting, sortedRows, rows, headers, radio, selectedRowIds, selectable, expandedRows, expandedRowIds, expandable*/ 10555455 | dirty[1] & /*$$scope*/ 131072) {
    				tablerow_changes.$$scope = { dirty, ctx };
    			}

    			tablerow.$set(tablerow_changes);

    			if (/*expandable*/ ctx[3] && /*expandedRows*/ ctx[21][/*row*/ ctx[53].id]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*expandable, expandedRows, sorting, sortedRows, rows*/ 10551305) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$b(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tablerow.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(tablerow.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			destroy_component(tablerow, detaching);
    			if (detaching) detach(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (297:4) <TableBody>
    function create_default_slot_2$1(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let current;

    	let each_value = /*sorting*/ ctx[16]
    	? /*sortedRows*/ ctx[23]
    	: /*rows*/ ctx[0];

    	const get_key = ctx => /*row*/ ctx[53].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*parentRowId, sorting, sortedRows, rows, selectable, headers, expandable, expandedRows, selectedRowIds, dispatch, radio, expandedRowIds*/ 77926463 | dirty[1] & /*$$scope*/ 131072) {
    				each_value = /*sorting*/ ctx[16]
    				? /*sortedRows*/ ctx[23]
    				: /*rows*/ ctx[0];

    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block$1, each_1_anchor, get_each_context$1);
    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (207:2) <Table     zebra="{zebra}"     size="{size}"     stickyHeader="{stickyHeader}"     sortable="{sortable}"   >
    function create_default_slot_1$4(ctx) {
    	let tablehead;
    	let t;
    	let tablebody;
    	let current;

    	tablehead = new TableHead({
    			props: {
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			}
    		});

    	tablebody = new TableBody({
    			props: {
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(tablehead.$$.fragment);
    			t = space();
    			create_component(tablebody.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tablehead, target, anchor);
    			insert(target, t, anchor);
    			mount_component(tablebody, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tablehead_changes = {};

    			if (dirty[0] & /*headers, $sortHeader, $thKeys, selectAll, indeterminate, refSelectAll, selectedRowIds, rows, batchSelection, radio, selectable, expanded, expandedRowIds, batchExpansion, expandable*/ 22722623 | dirty[1] & /*$$scope*/ 131072) {
    				tablehead_changes.$$scope = { dirty, ctx };
    			}

    			tablehead.$set(tablehead_changes);
    			const tablebody_changes = {};

    			if (dirty[0] & /*sorting, sortedRows, rows, parentRowId, selectable, headers, expandable, expandedRows, selectedRowIds, radio, expandedRowIds*/ 10817599 | dirty[1] & /*$$scope*/ 131072) {
    				tablebody_changes.$$scope = { dirty, ctx };
    			}

    			tablebody.$set(tablebody_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tablehead.$$.fragment, local);
    			transition_in(tablebody.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tablehead.$$.fragment, local);
    			transition_out(tablebody.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tablehead, detaching);
    			if (detaching) detach(t);
    			destroy_component(tablebody, detaching);
    		}
    	};
    }

    // (205:0) <TableContainer title="{title}" description="{description}" {...$$restProps}>
    function create_default_slot$7(ctx) {
    	let t;
    	let table;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[34].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[48], null);

    	table = new Table({
    			props: {
    				zebra: /*zebra*/ ctx[9],
    				size: /*size*/ ctx[6],
    				stickyHeader: /*stickyHeader*/ ctx[14],
    				sortable: /*sortable*/ ctx[10],
    				$$slots: { default: [create_default_slot_1$4] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    			t = space();
    			create_component(table.$$.fragment);
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			insert(target, t, anchor);
    			mount_component(table, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[1] & /*$$scope*/ 131072)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[48], dirty, null, null);
    				}
    			}

    			const table_changes = {};
    			if (dirty[0] & /*zebra*/ 512) table_changes.zebra = /*zebra*/ ctx[9];
    			if (dirty[0] & /*size*/ 64) table_changes.size = /*size*/ ctx[6];
    			if (dirty[0] & /*stickyHeader*/ 16384) table_changes.stickyHeader = /*stickyHeader*/ ctx[14];
    			if (dirty[0] & /*sortable*/ 1024) table_changes.sortable = /*sortable*/ ctx[10];

    			if (dirty[0] & /*sorting, sortedRows, rows, parentRowId, selectable, headers, expandable, expandedRows, selectedRowIds, radio, expandedRowIds, $sortHeader, $thKeys, selectAll, indeterminate, refSelectAll, batchSelection, expanded, batchExpansion*/ 33536063 | dirty[1] & /*$$scope*/ 131072) {
    				table_changes.$$scope = { dirty, ctx };
    			}

    			table.$set(table_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(table.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(table.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    			if (detaching) detach(t);
    			destroy_component(table, detaching);
    		}
    	};
    }

    function create_fragment$j(ctx) {
    	let tablecontainer;
    	let current;

    	const tablecontainer_spread_levels = [
    		{ title: /*title*/ ctx[7] },
    		{ description: /*description*/ ctx[8] },
    		/*$$restProps*/ ctx[30]
    	];

    	let tablecontainer_props = {
    		$$slots: { default: [create_default_slot$7] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < tablecontainer_spread_levels.length; i += 1) {
    		tablecontainer_props = assign(tablecontainer_props, tablecontainer_spread_levels[i]);
    	}

    	tablecontainer = new TableContainer({ props: tablecontainer_props });

    	return {
    		c() {
    			create_component(tablecontainer.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tablecontainer, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tablecontainer_changes = (dirty[0] & /*title, description, $$restProps*/ 1073742208)
    			? get_spread_update(tablecontainer_spread_levels, [
    					dirty[0] & /*title*/ 128 && { title: /*title*/ ctx[7] },
    					dirty[0] & /*description*/ 256 && { description: /*description*/ ctx[8] },
    					dirty[0] & /*$$restProps*/ 1073741824 && get_spread_object(/*$$restProps*/ ctx[30])
    				])
    			: {};

    			if (dirty[0] & /*zebra, size, stickyHeader, sortable, sorting, sortedRows, rows, parentRowId, selectable, headers, expandable, expandedRows, selectedRowIds, radio, expandedRowIds, $sortHeader, $thKeys, selectAll, indeterminate, refSelectAll, batchSelection, expanded, batchExpansion*/ 33554047 | dirty[1] & /*$$scope*/ 131072) {
    				tablecontainer_changes.$$scope = { dirty, ctx };
    			}

    			tablecontainer.$set(tablecontainer_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tablecontainer.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tablecontainer.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tablecontainer, detaching);
    		}
    	};
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let expandedRows;
    	let indeterminate;
    	let headerKeys;
    	let sortedRows;
    	let ascending;
    	let sortKey;
    	let sorting;

    	const omit_props_names = [
    		"headers","rows","size","title","description","zebra","sortable","expandable","batchExpansion","expandedRowIds","radio","selectable","batchSelection","selectedRowIds","stickyHeader"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let $headerItems;
    	let $sortHeader;
    	let $thKeys;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { headers = [] } = $$props;
    	let { rows = [] } = $$props;
    	let { size = undefined } = $$props;
    	let { title = "" } = $$props;
    	let { description = "" } = $$props;
    	let { zebra = false } = $$props;
    	let { sortable = false } = $$props;
    	let { expandable = false } = $$props;
    	let { batchExpansion = false } = $$props;
    	let { expandedRowIds = [] } = $$props;
    	let { radio = false } = $$props;
    	let { selectable = false } = $$props;
    	let { batchSelection = false } = $$props;
    	let { selectedRowIds = [] } = $$props;
    	let { stickyHeader = false } = $$props;

    	const sortDirectionMap = {
    		none: "ascending",
    		ascending: "descending",
    		descending: "none"
    	};

    	const dispatch = createEventDispatcher();
    	const batchSelectedIds = writable(false);
    	const tableSortable = writable(sortable);

    	const sortHeader = writable({
    		id: null,
    		key: null,
    		sort: undefined,
    		sortDirection: "none"
    	});

    	component_subscribe($$self, sortHeader, value => $$invalidate(15, $sortHeader = value));
    	const headerItems = writable([]);
    	component_subscribe($$self, headerItems, value => $$invalidate(49, $headerItems = value));
    	const thKeys = derived(headerItems, () => headers.map(({ key }, i) => ({ key, id: $headerItems[i] })).reduce((a, c) => ({ ...a, [c.key]: c.id }), {}));
    	component_subscribe($$self, thKeys, value => $$invalidate(24, $thKeys = value));
    	const resolvePath = (object, path, defaultValue) => path.split(/[\.\[\]\'\"]/).filter(p => p).reduce((o, p) => o && typeof o === "object" && o[p] ? o[p] : defaultValue, object);

    	setContext("DataTable", {
    		sortHeader,
    		tableSortable,
    		batchSelectedIds,
    		resetSelectedRowIds: () => {
    			$$invalidate(19, selectAll = false);
    			$$invalidate(2, selectedRowIds = []);
    			if (refSelectAll) $$invalidate(20, refSelectAll.checked = false, refSelectAll);
    		},
    		add: id => {
    			headerItems.update(_ => [..._, id]);
    		}
    	});

    	let expanded = false;
    	let parentRowId = null;
    	let selectAll = false;
    	let refSelectAll = null;

    	const click_handler = () => {
    		$$invalidate(17, expanded = !expanded);
    		$$invalidate(1, expandedRowIds = expanded ? rows.map(row => row.id) : []);
    		dispatch("click:header--expand", { expanded });
    	};

    	function inlinecheckbox_ref_binding(value) {
    		refSelectAll = value;
    		$$invalidate(20, refSelectAll);
    	}

    	const change_handler = e => {
    		if (indeterminate) {
    			e.target.checked = false;
    			$$invalidate(19, selectAll = false);
    			$$invalidate(2, selectedRowIds = []);
    			return;
    		}

    		if (e.target.checked) {
    			$$invalidate(2, selectedRowIds = rows.map(row => row.id));
    		} else {
    			$$invalidate(2, selectedRowIds = []);
    		}
    	};

    	const click_handler_1 = header => {
    		dispatch("click", { header });

    		if (header.sort === false) {
    			dispatch("click:header", { header });
    		} else {
    			let active = header.key === $sortHeader.key;
    			let currentSortDirection = active ? $sortHeader.sortDirection : "none";
    			let sortDirection = sortDirectionMap[currentSortDirection];
    			dispatch("click:header", { header, sortDirection });

    			sortHeader.set({
    				id: sortDirection === "none" ? null : $thKeys[header.key],
    				key: header.key,
    				sort: header.sort,
    				sortDirection
    			});
    		}
    	};

    	const click_handler_2 = row => {
    		const rowExpanded = !!expandedRows[row.id];

    		$$invalidate(1, expandedRowIds = rowExpanded
    		? expandedRowIds.filter(id => id !== row.id)
    		: [...expandedRowIds, row.id]);

    		dispatch("click:row--expand", { row, expanded: !rowExpanded });
    	};

    	const change_handler_1 = row => {
    		$$invalidate(2, selectedRowIds = [row.id]);
    	};

    	const change_handler_2 = row => {
    		if (selectedRowIds.includes(row.id)) {
    			$$invalidate(2, selectedRowIds = selectedRowIds.filter(id => id !== row.id));
    		} else {
    			$$invalidate(2, selectedRowIds = [...selectedRowIds, row.id]);
    		}
    	};

    	const click_handler_3 = (row, cell) => {
    		dispatch("click", { row, cell });
    		dispatch("click:cell", cell);
    	};

    	const click_handler_4 = row => {
    		dispatch("click", { row });
    		dispatch("click:row", row);
    	};

    	const mouseenter_handler = row => {
    		dispatch("mouseenter:row", row);
    	};

    	const mouseleave_handler = row => {
    		dispatch("mouseleave:row", row);
    	};

    	const mouseenter_handler_1 = row => {
    		$$invalidate(18, parentRowId = row.id);
    	};

    	const mouseleave_handler_1 = () => {
    		$$invalidate(18, parentRowId = null);
    	};

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(30, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("headers" in $$new_props) $$invalidate(5, headers = $$new_props.headers);
    		if ("rows" in $$new_props) $$invalidate(0, rows = $$new_props.rows);
    		if ("size" in $$new_props) $$invalidate(6, size = $$new_props.size);
    		if ("title" in $$new_props) $$invalidate(7, title = $$new_props.title);
    		if ("description" in $$new_props) $$invalidate(8, description = $$new_props.description);
    		if ("zebra" in $$new_props) $$invalidate(9, zebra = $$new_props.zebra);
    		if ("sortable" in $$new_props) $$invalidate(10, sortable = $$new_props.sortable);
    		if ("expandable" in $$new_props) $$invalidate(3, expandable = $$new_props.expandable);
    		if ("batchExpansion" in $$new_props) $$invalidate(11, batchExpansion = $$new_props.batchExpansion);
    		if ("expandedRowIds" in $$new_props) $$invalidate(1, expandedRowIds = $$new_props.expandedRowIds);
    		if ("radio" in $$new_props) $$invalidate(12, radio = $$new_props.radio);
    		if ("selectable" in $$new_props) $$invalidate(4, selectable = $$new_props.selectable);
    		if ("batchSelection" in $$new_props) $$invalidate(13, batchSelection = $$new_props.batchSelection);
    		if ("selectedRowIds" in $$new_props) $$invalidate(2, selectedRowIds = $$new_props.selectedRowIds);
    		if ("stickyHeader" in $$new_props) $$invalidate(14, stickyHeader = $$new_props.stickyHeader);
    		if ("$$scope" in $$new_props) $$invalidate(48, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*expandedRowIds*/ 2) {
    			$$invalidate(21, expandedRows = expandedRowIds.reduce((a, id) => ({ ...a, [id]: true }), {}));
    		}

    		if ($$self.$$.dirty[0] & /*selectedRowIds*/ 4) {
    			batchSelectedIds.set(selectedRowIds);
    		}

    		if ($$self.$$.dirty[0] & /*headers*/ 32) {
    			$$invalidate(31, headerKeys = headers.map(({ key }) => key));
    		}

    		if ($$self.$$.dirty[0] & /*rows, headers*/ 33 | $$self.$$.dirty[1] & /*headerKeys*/ 1) {
    			$$invalidate(0, rows = rows.map(row => ({
    				...row,
    				cells: headerKeys.map((key, index) => ({
    					key,
    					value: resolvePath(row, key, ""),
    					display: headers[index].display
    				}))
    			})));
    		}

    		if ($$self.$$.dirty[0] & /*selectedRowIds, rows*/ 5) {
    			$$invalidate(22, indeterminate = selectedRowIds.length > 0 && selectedRowIds.length < rows.length);
    		}

    		if ($$self.$$.dirty[0] & /*batchExpansion*/ 2048) {
    			if (batchExpansion) $$invalidate(3, expandable = true);
    		}

    		if ($$self.$$.dirty[0] & /*radio, batchSelection*/ 12288) {
    			if (radio || batchSelection) $$invalidate(4, selectable = true);
    		}

    		if ($$self.$$.dirty[0] & /*sortable*/ 1024) {
    			tableSortable.set(sortable);
    		}

    		if ($$self.$$.dirty[0] & /*rows*/ 1) {
    			$$invalidate(23, sortedRows = rows);
    		}

    		if ($$self.$$.dirty[0] & /*$sortHeader*/ 32768) {
    			$$invalidate(32, ascending = $sortHeader.sortDirection === "ascending");
    		}

    		if ($$self.$$.dirty[0] & /*$sortHeader*/ 32768) {
    			$$invalidate(33, sortKey = $sortHeader.key);
    		}

    		if ($$self.$$.dirty[0] & /*sortable*/ 1024 | $$self.$$.dirty[1] & /*sortKey*/ 4) {
    			$$invalidate(16, sorting = sortable && sortKey != null);
    		}

    		if ($$self.$$.dirty[0] & /*sorting, $sortHeader, rows*/ 98305 | $$self.$$.dirty[1] & /*ascending, sortKey*/ 6) {
    			if (sorting) {
    				if ($sortHeader.sortDirection === "none") {
    					$$invalidate(23, sortedRows = rows);
    				} else {
    					$$invalidate(23, sortedRows = [...rows].sort((a, b) => {
    						const itemA = ascending
    						? resolvePath(a, sortKey, "")
    						: resolvePath(b, sortKey, "");

    						const itemB = ascending
    						? resolvePath(b, sortKey, "")
    						: resolvePath(a, sortKey, "");

    						if ($sortHeader.sort) return $sortHeader.sort(itemA, itemB);
    						if (typeof itemA === "number" && typeof itemB === "number") return itemA - itemB;
    						return itemA.toString().localeCompare(itemB.toString(), "en", { numeric: true });
    					}));
    				}
    			}
    		}
    	};

    	return [
    		rows,
    		expandedRowIds,
    		selectedRowIds,
    		expandable,
    		selectable,
    		headers,
    		size,
    		title,
    		description,
    		zebra,
    		sortable,
    		batchExpansion,
    		radio,
    		batchSelection,
    		stickyHeader,
    		$sortHeader,
    		sorting,
    		expanded,
    		parentRowId,
    		selectAll,
    		refSelectAll,
    		expandedRows,
    		indeterminate,
    		sortedRows,
    		$thKeys,
    		sortDirectionMap,
    		dispatch,
    		sortHeader,
    		headerItems,
    		thKeys,
    		$$restProps,
    		headerKeys,
    		ascending,
    		sortKey,
    		slots,
    		click_handler,
    		inlinecheckbox_ref_binding,
    		change_handler,
    		click_handler_1,
    		click_handler_2,
    		change_handler_1,
    		change_handler_2,
    		click_handler_3,
    		click_handler_4,
    		mouseenter_handler,
    		mouseleave_handler,
    		mouseenter_handler_1,
    		mouseleave_handler_1,
    		$$scope
    	];
    }

    class DataTable extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$j,
    			create_fragment$j,
    			safe_not_equal,
    			{
    				headers: 5,
    				rows: 0,
    				size: 6,
    				title: 7,
    				description: 8,
    				zebra: 9,
    				sortable: 10,
    				expandable: 3,
    				batchExpansion: 11,
    				expandedRowIds: 1,
    				radio: 12,
    				selectable: 4,
    				batchSelection: 13,
    				selectedRowIds: 2,
    				stickyHeader: 14
    			},
    			[-1, -1]
    		);
    	}
    }

    /* node_modules/carbon-icons-svelte/lib/Search16/Search16.svelte generated by Svelte v3.38.2 */

    function create_if_block$a(ctx) {
    	let title_1;
    	let t;

    	return {
    		c() {
    			title_1 = svg_element("title");
    			t = text(/*title*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, title_1, anchor);
    			append(title_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 4) set_data(t, /*title*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(title_1);
    		}
    	};
    }

    // (38:8)      
    function fallback_block$2(ctx) {
    	let if_block_anchor;
    	let if_block = /*title*/ ctx[2] && create_if_block$a(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$a(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$i(ctx) {
    	let svg;
    	let path;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	const default_slot_or_fallback = default_slot || fallback_block$2(ctx);

    	let svg_levels = [
    		{ "data-carbon-icon": "Search16" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 16 16" },
    		{ fill: "currentColor" },
    		{ width: "16" },
    		{ height: "16" },
    		{ class: /*className*/ ctx[0] },
    		{ preserveAspectRatio: "xMidYMid meet" },
    		{ style: /*style*/ ctx[3] },
    		{ id: /*id*/ ctx[1] },
    		/*attributes*/ ctx[4]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr(path, "d", "M15,14.3L10.7,10c1.9-2.3,1.6-5.8-0.7-7.7S4.2,0.7,2.3,3S0.7,8.8,3,10.7c2,1.7,5,1.7,7,0l4.3,4.3L15,14.3z M2,6.5\tC2,4,4,2,6.5,2S11,4,11,6.5S9,11,6.5,11S2,9,2,6.5z");
    			set_svg_attributes(svg, svg_data);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(svg, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(svg, "click", /*click_handler*/ ctx[12]),
    					listen(svg, "mouseover", /*mouseover_handler*/ ctx[13]),
    					listen(svg, "mouseenter", /*mouseenter_handler*/ ctx[14]),
    					listen(svg, "mouseleave", /*mouseleave_handler*/ ctx[15]),
    					listen(svg, "keyup", /*keyup_handler*/ ctx[16]),
    					listen(svg, "keydown", /*keydown_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*title*/ 4) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "data-carbon-icon": "Search16" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 16 16" },
    				{ fill: "currentColor" },
    				{ width: "16" },
    				{ height: "16" },
    				(!current || dirty & /*className*/ 1) && { class: /*className*/ ctx[0] },
    				{ preserveAspectRatio: "xMidYMid meet" },
    				(!current || dirty & /*style*/ 8) && { style: /*style*/ ctx[3] },
    				(!current || dirty & /*id*/ 2) && { id: /*id*/ ctx[1] },
    				dirty & /*attributes*/ 16 && /*attributes*/ ctx[4]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let ariaLabel;
    	let ariaLabelledBy;
    	let labelled;
    	let attributes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { tabindex = undefined } = $$props;
    	let { focusable = false } = $$props;
    	let { title = undefined } = $$props;
    	let { style = undefined } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(18, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("class" in $$new_props) $$invalidate(0, className = $$new_props.class);
    		if ("id" in $$new_props) $$invalidate(1, id = $$new_props.id);
    		if ("tabindex" in $$new_props) $$invalidate(5, tabindex = $$new_props.tabindex);
    		if ("focusable" in $$new_props) $$invalidate(6, focusable = $$new_props.focusable);
    		if ("title" in $$new_props) $$invalidate(2, title = $$new_props.title);
    		if ("style" in $$new_props) $$invalidate(3, style = $$new_props.style);
    		if ("$$scope" in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		$$invalidate(7, ariaLabel = $$props["aria-label"]);
    		$$invalidate(8, ariaLabelledBy = $$props["aria-labelledby"]);

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, title*/ 388) {
    			$$invalidate(9, labelled = ariaLabel || ariaLabelledBy || title);
    		}

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, labelled, tabindex, focusable*/ 992) {
    			$$invalidate(4, attributes = {
    				"aria-label": ariaLabel,
    				"aria-labelledby": ariaLabelledBy,
    				"aria-hidden": labelled ? undefined : true,
    				role: labelled ? "img" : undefined,
    				focusable: tabindex === "0" ? true : focusable,
    				tabindex
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		className,
    		id,
    		title,
    		style,
    		attributes,
    		tabindex,
    		focusable,
    		ariaLabel,
    		ariaLabelledBy,
    		labelled,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		keyup_handler,
    		keydown_handler
    	];
    }

    class Search16 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {
    			class: 0,
    			id: 1,
    			tabindex: 5,
    			focusable: 6,
    			title: 2,
    			style: 3
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/Search/SearchSkeleton.svelte generated by Svelte v3.38.2 */

    function create_fragment$h(ctx) {
    	let div1;
    	let span;
    	let t;
    	let div0;
    	let mounted;
    	let dispose;
    	let div1_levels = [/*$$restProps*/ ctx[2]];
    	let div1_data = {};

    	for (let i = 0; i < div1_levels.length; i += 1) {
    		div1_data = assign(div1_data, div1_levels[i]);
    	}

    	return {
    		c() {
    			div1 = element("div");
    			span = element("span");
    			t = space();
    			div0 = element("div");
    			toggle_class(span, "bx--label", true);
    			toggle_class(div0, "bx--search-input", true);
    			set_attributes(div1, div1_data);
    			toggle_class(div1, "bx--skeleton", true);
    			toggle_class(div1, "bx--search--sm", /*size*/ ctx[1] === "sm" || /*small*/ ctx[0]);
    			toggle_class(div1, "bx--search--lg", /*size*/ ctx[1] === "lg");
    			toggle_class(div1, "bx--search--xl", /*size*/ ctx[1] === "xl");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, span);
    			append(div1, t);
    			append(div1, div0);

    			if (!mounted) {
    				dispose = [
    					listen(div1, "click", /*click_handler*/ ctx[3]),
    					listen(div1, "mouseover", /*mouseover_handler*/ ctx[4]),
    					listen(div1, "mouseenter", /*mouseenter_handler*/ ctx[5]),
    					listen(div1, "mouseleave", /*mouseleave_handler*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			set_attributes(div1, div1_data = get_spread_update(div1_levels, [dirty & /*$$restProps*/ 4 && /*$$restProps*/ ctx[2]]));
    			toggle_class(div1, "bx--skeleton", true);
    			toggle_class(div1, "bx--search--sm", /*size*/ ctx[1] === "sm" || /*small*/ ctx[0]);
    			toggle_class(div1, "bx--search--lg", /*size*/ ctx[1] === "lg");
    			toggle_class(div1, "bx--search--xl", /*size*/ ctx[1] === "xl");
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$h($$self, $$props, $$invalidate) {
    	const omit_props_names = ["small","size"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { small = false } = $$props;
    	let { size = "xl" } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(2, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("small" in $$new_props) $$invalidate(0, small = $$new_props.small);
    		if ("size" in $$new_props) $$invalidate(1, size = $$new_props.size);
    	};

    	return [
    		small,
    		size,
    		$$restProps,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler
    	];
    }

    class SearchSkeleton extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, { small: 0, size: 1 });
    	}
    }

    /* node_modules/carbon-components-svelte/src/Search/Search.svelte generated by Svelte v3.38.2 */

    function create_else_block$5(ctx) {
    	let div1;
    	let div0;
    	let search16;
    	let t0;
    	let label;
    	let t1;
    	let label_id_value;
    	let t2;
    	let input;
    	let input_autofocus_value;
    	let t3;
    	let button;
    	let switch_instance;
    	let div1_aria_labelledby_value;
    	let current;
    	let mounted;
    	let dispose;

    	search16 = new Search16({
    			props: { class: "bx--search-magnifier-icon" }
    		});

    	let input_levels = [
    		{ role: "searchbox" },
    		{
    			autofocus: input_autofocus_value = /*autofocus*/ ctx[11] === true ? true : undefined
    		},
    		{ autocomplete: /*autocomplete*/ ctx[10] },
    		{ disabled: /*disabled*/ ctx[7] },
    		{ id: /*id*/ ctx[14] },
    		{ placeholder: /*placeholder*/ ctx[9] },
    		{ type: /*type*/ ctx[8] },
    		{ value: /*value*/ ctx[0] },
    		/*$$restProps*/ ctx[16]
    	];

    	let input_data = {};

    	for (let i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	var switch_value = /*size*/ ctx[3] === "xl" ? Close20 : Close16;

    	function switch_props(ctx) {
    		return {};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			create_component(search16.$$.fragment);
    			t0 = space();
    			label = element("label");
    			t1 = text(/*labelText*/ ctx[13]);
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			button = element("button");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			toggle_class(div0, "bx--search-magnifier", true);
    			attr(label, "id", label_id_value = "" + (/*id*/ ctx[14] + "-search"));
    			attr(label, "for", /*id*/ ctx[14]);
    			toggle_class(label, "bx--label", true);
    			set_attributes(input, input_data);
    			toggle_class(input, "bx--search-input", true);
    			attr(button, "type", "button");
    			attr(button, "aria-label", /*closeButtonLabelText*/ ctx[12]);
    			button.disabled = /*disabled*/ ctx[7];
    			toggle_class(button, "bx--search-close", true);
    			toggle_class(button, "bx--search-close--hidden", /*value*/ ctx[0] === "");
    			attr(div1, "role", "search");
    			attr(div1, "aria-labelledby", div1_aria_labelledby_value = "" + (/*id*/ ctx[14] + "-search"));
    			attr(div1, "class", /*searchClass*/ ctx[4]);
    			toggle_class(div1, "bx--search", true);
    			toggle_class(div1, "bx--search--light", /*light*/ ctx[6]);
    			toggle_class(div1, "bx--search--disabled", /*disabled*/ ctx[7]);
    			toggle_class(div1, "bx--search--sm", /*size*/ ctx[3] === "sm" || /*small*/ ctx[2]);
    			toggle_class(div1, "bx--search--lg", /*size*/ ctx[3] === "lg");
    			toggle_class(div1, "bx--search--xl", /*size*/ ctx[3] === "xl");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			mount_component(search16, div0, null);
    			append(div1, t0);
    			append(div1, label);
    			append(label, t1);
    			append(div1, t2);
    			append(div1, input);
    			input.value = input_data.value;
    			/*input_binding*/ ctx[27](input);
    			append(div1, t3);
    			append(div1, button);

    			if (switch_instance) {
    				mount_component(switch_instance, button, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input, "change", /*change_handler*/ ctx[18]),
    					listen(input, "input", /*input_handler*/ ctx[19]),
    					listen(input, "input", /*input_handler_1*/ ctx[28]),
    					listen(input, "focus", /*focus_handler*/ ctx[20]),
    					listen(input, "blur", /*blur_handler*/ ctx[21]),
    					listen(input, "keydown", /*keydown_handler*/ ctx[22]),
    					listen(input, "keydown", /*keydown_handler_1*/ ctx[29]),
    					listen(button, "click", /*click_handler_1*/ ctx[17]),
    					listen(button, "click", /*click_handler_2*/ ctx[30])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (!current || dirty & /*labelText*/ 8192) set_data(t1, /*labelText*/ ctx[13]);

    			if (!current || dirty & /*id*/ 16384 && label_id_value !== (label_id_value = "" + (/*id*/ ctx[14] + "-search"))) {
    				attr(label, "id", label_id_value);
    			}

    			if (!current || dirty & /*id*/ 16384) {
    				attr(label, "for", /*id*/ ctx[14]);
    			}

    			set_attributes(input, input_data = get_spread_update(input_levels, [
    				{ role: "searchbox" },
    				(!current || dirty & /*autofocus*/ 2048 && input_autofocus_value !== (input_autofocus_value = /*autofocus*/ ctx[11] === true ? true : undefined)) && { autofocus: input_autofocus_value },
    				(!current || dirty & /*autocomplete*/ 1024) && { autocomplete: /*autocomplete*/ ctx[10] },
    				(!current || dirty & /*disabled*/ 128) && { disabled: /*disabled*/ ctx[7] },
    				(!current || dirty & /*id*/ 16384) && { id: /*id*/ ctx[14] },
    				(!current || dirty & /*placeholder*/ 512) && { placeholder: /*placeholder*/ ctx[9] },
    				(!current || dirty & /*type*/ 256) && { type: /*type*/ ctx[8] },
    				(!current || dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) && { value: /*value*/ ctx[0] },
    				dirty & /*$$restProps*/ 65536 && /*$$restProps*/ ctx[16]
    			]));

    			if ("value" in input_data) {
    				input.value = input_data.value;
    			}

    			toggle_class(input, "bx--search-input", true);

    			if (switch_value !== (switch_value = /*size*/ ctx[3] === "xl" ? Close20 : Close16)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, button, null);
    				} else {
    					switch_instance = null;
    				}
    			}

    			if (!current || dirty & /*closeButtonLabelText*/ 4096) {
    				attr(button, "aria-label", /*closeButtonLabelText*/ ctx[12]);
    			}

    			if (!current || dirty & /*disabled*/ 128) {
    				button.disabled = /*disabled*/ ctx[7];
    			}

    			if (dirty & /*value*/ 1) {
    				toggle_class(button, "bx--search-close--hidden", /*value*/ ctx[0] === "");
    			}

    			if (!current || dirty & /*id*/ 16384 && div1_aria_labelledby_value !== (div1_aria_labelledby_value = "" + (/*id*/ ctx[14] + "-search"))) {
    				attr(div1, "aria-labelledby", div1_aria_labelledby_value);
    			}

    			if (!current || dirty & /*searchClass*/ 16) {
    				attr(div1, "class", /*searchClass*/ ctx[4]);
    			}

    			if (dirty & /*searchClass*/ 16) {
    				toggle_class(div1, "bx--search", true);
    			}

    			if (dirty & /*searchClass, light*/ 80) {
    				toggle_class(div1, "bx--search--light", /*light*/ ctx[6]);
    			}

    			if (dirty & /*searchClass, disabled*/ 144) {
    				toggle_class(div1, "bx--search--disabled", /*disabled*/ ctx[7]);
    			}

    			if (dirty & /*searchClass, size, small*/ 28) {
    				toggle_class(div1, "bx--search--sm", /*size*/ ctx[3] === "sm" || /*small*/ ctx[2]);
    			}

    			if (dirty & /*searchClass, size*/ 24) {
    				toggle_class(div1, "bx--search--lg", /*size*/ ctx[3] === "lg");
    			}

    			if (dirty & /*searchClass, size*/ 24) {
    				toggle_class(div1, "bx--search--xl", /*size*/ ctx[3] === "xl");
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(search16.$$.fragment, local);
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(search16.$$.fragment, local);
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_component(search16);
    			/*input_binding*/ ctx[27](null);
    			if (switch_instance) destroy_component(switch_instance);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (84:0) {#if skeleton}
    function create_if_block$9(ctx) {
    	let searchskeleton;
    	let current;

    	const searchskeleton_spread_levels = [
    		{ small: /*small*/ ctx[2] },
    		{ size: /*size*/ ctx[3] },
    		/*$$restProps*/ ctx[16]
    	];

    	let searchskeleton_props = {};

    	for (let i = 0; i < searchskeleton_spread_levels.length; i += 1) {
    		searchskeleton_props = assign(searchskeleton_props, searchskeleton_spread_levels[i]);
    	}

    	searchskeleton = new SearchSkeleton({ props: searchskeleton_props });
    	searchskeleton.$on("click", /*click_handler*/ ctx[23]);
    	searchskeleton.$on("mouseover", /*mouseover_handler*/ ctx[24]);
    	searchskeleton.$on("mouseenter", /*mouseenter_handler*/ ctx[25]);
    	searchskeleton.$on("mouseleave", /*mouseleave_handler*/ ctx[26]);

    	return {
    		c() {
    			create_component(searchskeleton.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(searchskeleton, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const searchskeleton_changes = (dirty & /*small, size, $$restProps*/ 65548)
    			? get_spread_update(searchskeleton_spread_levels, [
    					dirty & /*small*/ 4 && { small: /*small*/ ctx[2] },
    					dirty & /*size*/ 8 && { size: /*size*/ ctx[3] },
    					dirty & /*$$restProps*/ 65536 && get_spread_object(/*$$restProps*/ ctx[16])
    				])
    			: {};

    			searchskeleton.$set(searchskeleton_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(searchskeleton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(searchskeleton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(searchskeleton, detaching);
    		}
    	};
    }

    function create_fragment$g(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$9, create_else_block$5];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*skeleton*/ ctx[5]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$g($$self, $$props, $$invalidate) {
    	const omit_props_names = [
    		"small","size","searchClass","skeleton","light","disabled","value","type","placeholder","autocomplete","autofocus","closeButtonLabelText","labelText","id","ref"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { small = false } = $$props;
    	let { size = "xl" } = $$props;
    	let { searchClass = "" } = $$props;
    	let { skeleton = false } = $$props;
    	let { light = false } = $$props;
    	let { disabled = false } = $$props;
    	let { value = "" } = $$props;
    	let { type = "text" } = $$props;
    	let { placeholder = "Search..." } = $$props;
    	let { autocomplete = "off" } = $$props;
    	let { autofocus = false } = $$props;
    	let { closeButtonLabelText = "Clear search input" } = $$props;
    	let { labelText = "" } = $$props;
    	let { id = "ccs-" + Math.random().toString(36) } = $$props;
    	let { ref = null } = $$props;
    	const dispatch = createEventDispatcher();

    	function click_handler_1(event) {
    		bubble($$self, event);
    	}

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	function input_handler(event) {
    		bubble($$self, event);
    	}

    	function focus_handler(event) {
    		bubble($$self, event);
    	}

    	function blur_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			ref = $$value;
    			$$invalidate(1, ref);
    		});
    	}

    	const input_handler_1 = ({ target }) => {
    		$$invalidate(0, value = target.value);
    	};

    	const keydown_handler_1 = ({ key }) => {
    		if (key === "Escape") {
    			$$invalidate(0, value = "");
    			dispatch("clear");
    		}
    	};

    	const click_handler_2 = () => {
    		$$invalidate(0, value = "");
    		ref.focus();
    		dispatch("clear");
    	};

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(16, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("small" in $$new_props) $$invalidate(2, small = $$new_props.small);
    		if ("size" in $$new_props) $$invalidate(3, size = $$new_props.size);
    		if ("searchClass" in $$new_props) $$invalidate(4, searchClass = $$new_props.searchClass);
    		if ("skeleton" in $$new_props) $$invalidate(5, skeleton = $$new_props.skeleton);
    		if ("light" in $$new_props) $$invalidate(6, light = $$new_props.light);
    		if ("disabled" in $$new_props) $$invalidate(7, disabled = $$new_props.disabled);
    		if ("value" in $$new_props) $$invalidate(0, value = $$new_props.value);
    		if ("type" in $$new_props) $$invalidate(8, type = $$new_props.type);
    		if ("placeholder" in $$new_props) $$invalidate(9, placeholder = $$new_props.placeholder);
    		if ("autocomplete" in $$new_props) $$invalidate(10, autocomplete = $$new_props.autocomplete);
    		if ("autofocus" in $$new_props) $$invalidate(11, autofocus = $$new_props.autofocus);
    		if ("closeButtonLabelText" in $$new_props) $$invalidate(12, closeButtonLabelText = $$new_props.closeButtonLabelText);
    		if ("labelText" in $$new_props) $$invalidate(13, labelText = $$new_props.labelText);
    		if ("id" in $$new_props) $$invalidate(14, id = $$new_props.id);
    		if ("ref" in $$new_props) $$invalidate(1, ref = $$new_props.ref);
    	};

    	return [
    		value,
    		ref,
    		small,
    		size,
    		searchClass,
    		skeleton,
    		light,
    		disabled,
    		type,
    		placeholder,
    		autocomplete,
    		autofocus,
    		closeButtonLabelText,
    		labelText,
    		id,
    		dispatch,
    		$$restProps,
    		click_handler_1,
    		change_handler,
    		input_handler,
    		focus_handler,
    		blur_handler,
    		keydown_handler,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		input_binding,
    		input_handler_1,
    		keydown_handler_1,
    		click_handler_2
    	];
    }

    class Search extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {
    			small: 2,
    			size: 3,
    			searchClass: 4,
    			skeleton: 5,
    			light: 6,
    			disabled: 7,
    			value: 0,
    			type: 8,
    			placeholder: 9,
    			autocomplete: 10,
    			autofocus: 11,
    			closeButtonLabelText: 12,
    			labelText: 13,
    			id: 14,
    			ref: 1
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/Grid/Grid.svelte generated by Svelte v3.38.2 */

    const get_default_slot_changes$2 = dirty => ({ props: dirty & /*props*/ 2 });
    const get_default_slot_context$2 = ctx => ({ props: /*props*/ ctx[1] });

    // (54:0) {:else}
    function create_else_block$4(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);
    	let div_levels = [/*props*/ ctx[1]];
    	let div_data = {};

    	for (let i = 0; i < div_levels.length; i += 1) {
    		div_data = assign(div_data, div_levels[i]);
    	}

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			set_attributes(div, div_data);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 512)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, null, null);
    				}
    			}

    			set_attributes(div, div_data = get_spread_update(div_levels, [dirty & /*props*/ 2 && /*props*/ ctx[1]]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (52:0) {#if as}
    function create_if_block$8(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], get_default_slot_context$2);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, props*/ 514)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, get_default_slot_changes$2, get_default_slot_context$2);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$f(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$8, create_else_block$4];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*as*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let props;

    	const omit_props_names = [
    		"as","condensed","narrow","fullWidth","noGutter","noGutterLeft","noGutterRight","padding"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { as = false } = $$props;
    	let { condensed = false } = $$props;
    	let { narrow = false } = $$props;
    	let { fullWidth = false } = $$props;
    	let { noGutter = false } = $$props;
    	let { noGutterLeft = false } = $$props;
    	let { noGutterRight = false } = $$props;
    	let { padding = false } = $$props;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(11, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("as" in $$new_props) $$invalidate(0, as = $$new_props.as);
    		if ("condensed" in $$new_props) $$invalidate(2, condensed = $$new_props.condensed);
    		if ("narrow" in $$new_props) $$invalidate(3, narrow = $$new_props.narrow);
    		if ("fullWidth" in $$new_props) $$invalidate(4, fullWidth = $$new_props.fullWidth);
    		if ("noGutter" in $$new_props) $$invalidate(5, noGutter = $$new_props.noGutter);
    		if ("noGutterLeft" in $$new_props) $$invalidate(6, noGutterLeft = $$new_props.noGutterLeft);
    		if ("noGutterRight" in $$new_props) $$invalidate(7, noGutterRight = $$new_props.noGutterRight);
    		if ("padding" in $$new_props) $$invalidate(8, padding = $$new_props.padding);
    		if ("$$scope" in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		$$invalidate(1, props = {
    			...$$restProps,
    			class: [
    				$$restProps.class,
    				"bx--grid",
    				condensed && "bx--grid--condensed",
    				narrow && "bx--grid--narrow",
    				fullWidth && "bx--grid--full-width",
    				noGutter && "bx--no-gutter",
    				noGutterLeft && "bx--no-gutter--left",
    				noGutterRight && "bx--no-gutter--right",
    				padding && "bx--row-padding"
    			].filter(Boolean).join(" ")
    		});
    	};

    	return [
    		as,
    		props,
    		condensed,
    		narrow,
    		fullWidth,
    		noGutter,
    		noGutterLeft,
    		noGutterRight,
    		padding,
    		$$scope,
    		slots
    	];
    }

    class Grid extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {
    			as: 0,
    			condensed: 2,
    			narrow: 3,
    			fullWidth: 4,
    			noGutter: 5,
    			noGutterLeft: 6,
    			noGutterRight: 7,
    			padding: 8
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/Grid/Row.svelte generated by Svelte v3.38.2 */

    const get_default_slot_changes$1 = dirty => ({ props: dirty & /*props*/ 2 });
    const get_default_slot_context$1 = ctx => ({ props: /*props*/ ctx[1] });

    // (50:0) {:else}
    function create_else_block$3(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);
    	let div_levels = [/*props*/ ctx[1]];
    	let div_data = {};

    	for (let i = 0; i < div_levels.length; i += 1) {
    		div_data = assign(div_data, div_levels[i]);
    	}

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			set_attributes(div, div_data);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			set_attributes(div, div_data = get_spread_update(div_levels, [dirty & /*props*/ 2 && /*props*/ ctx[1]]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (48:0) {#if as}
    function create_if_block$7(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], get_default_slot_context$1);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, props*/ 258)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, get_default_slot_changes$1, get_default_slot_context$1);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$e(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$7, create_else_block$3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*as*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let props;
    	const omit_props_names = ["as","condensed","narrow","noGutter","noGutterLeft","noGutterRight","padding"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { as = false } = $$props;
    	let { condensed = false } = $$props;
    	let { narrow = false } = $$props;
    	let { noGutter = false } = $$props;
    	let { noGutterLeft = false } = $$props;
    	let { noGutterRight = false } = $$props;
    	let { padding = false } = $$props;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(10, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("as" in $$new_props) $$invalidate(0, as = $$new_props.as);
    		if ("condensed" in $$new_props) $$invalidate(2, condensed = $$new_props.condensed);
    		if ("narrow" in $$new_props) $$invalidate(3, narrow = $$new_props.narrow);
    		if ("noGutter" in $$new_props) $$invalidate(4, noGutter = $$new_props.noGutter);
    		if ("noGutterLeft" in $$new_props) $$invalidate(5, noGutterLeft = $$new_props.noGutterLeft);
    		if ("noGutterRight" in $$new_props) $$invalidate(6, noGutterRight = $$new_props.noGutterRight);
    		if ("padding" in $$new_props) $$invalidate(7, padding = $$new_props.padding);
    		if ("$$scope" in $$new_props) $$invalidate(8, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		$$invalidate(1, props = {
    			...$$restProps,
    			class: [
    				$$restProps.class,
    				"bx--row",
    				condensed && "bx--row--condensed",
    				narrow && "bx--row--narrow",
    				noGutter && "bx--no-gutter",
    				noGutterLeft && "bx--no-gutter--left",
    				noGutterRight && "bx--no-gutter--right",
    				padding && "bx--row-padding"
    			].filter(Boolean).join(" ")
    		});
    	};

    	return [
    		as,
    		props,
    		condensed,
    		narrow,
    		noGutter,
    		noGutterLeft,
    		noGutterRight,
    		padding,
    		$$scope,
    		slots
    	];
    }

    class Row extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {
    			as: 0,
    			condensed: 2,
    			narrow: 3,
    			noGutter: 4,
    			noGutterLeft: 5,
    			noGutterRight: 6,
    			padding: 7
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/Grid/Column.svelte generated by Svelte v3.38.2 */

    const get_default_slot_changes = dirty => ({ props: dirty & /*props*/ 2 });
    const get_default_slot_context = ctx => ({ props: /*props*/ ctx[1] });

    // (115:0) {:else}
    function create_else_block$2(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[14].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[13], null);
    	let div_levels = [/*props*/ ctx[1]];
    	let div_data = {};

    	for (let i = 0; i < div_levels.length; i += 1) {
    		div_data = assign(div_data, div_levels[i]);
    	}

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			set_attributes(div, div_data);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8192)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[13], dirty, null, null);
    				}
    			}

    			set_attributes(div, div_data = get_spread_update(div_levels, [dirty & /*props*/ 2 && /*props*/ ctx[1]]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (113:0) {#if as}
    function create_if_block$6(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[14].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[13], get_default_slot_context);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, props*/ 8194)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[13], dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$d(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$6, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*as*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let columnClass;
    	let props;

    	const omit_props_names = [
    		"as","noGutter","noGutterLeft","noGutterRight","padding","aspectRatio","sm","md","lg","xlg","max"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { as = false } = $$props;
    	let { noGutter = false } = $$props;
    	let { noGutterLeft = false } = $$props;
    	let { noGutterRight = false } = $$props;
    	let { padding = false } = $$props;
    	let { aspectRatio = undefined } = $$props;
    	let { sm = undefined } = $$props;
    	let { md = undefined } = $$props;
    	let { lg = undefined } = $$props;
    	let { xlg = undefined } = $$props;
    	let { max = undefined } = $$props;
    	const breakpoints = ["sm", "md", "lg", "xlg", "max"];

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(16, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("as" in $$new_props) $$invalidate(0, as = $$new_props.as);
    		if ("noGutter" in $$new_props) $$invalidate(2, noGutter = $$new_props.noGutter);
    		if ("noGutterLeft" in $$new_props) $$invalidate(3, noGutterLeft = $$new_props.noGutterLeft);
    		if ("noGutterRight" in $$new_props) $$invalidate(4, noGutterRight = $$new_props.noGutterRight);
    		if ("padding" in $$new_props) $$invalidate(5, padding = $$new_props.padding);
    		if ("aspectRatio" in $$new_props) $$invalidate(6, aspectRatio = $$new_props.aspectRatio);
    		if ("sm" in $$new_props) $$invalidate(7, sm = $$new_props.sm);
    		if ("md" in $$new_props) $$invalidate(8, md = $$new_props.md);
    		if ("lg" in $$new_props) $$invalidate(9, lg = $$new_props.lg);
    		if ("xlg" in $$new_props) $$invalidate(10, xlg = $$new_props.xlg);
    		if ("max" in $$new_props) $$invalidate(11, max = $$new_props.max);
    		if ("$$scope" in $$new_props) $$invalidate(13, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*sm, md, lg, xlg, max*/ 3968) {
    			$$invalidate(12, columnClass = [sm, md, lg, xlg, max].map((breakpoint, i) => {
    				const name = breakpoints[i];

    				if (breakpoint === true) {
    					return `bx--col-${name}`;
    				} else if (typeof breakpoint === "number") {
    					return `bx--col-${name}-${breakpoint}`;
    				} else if (typeof breakpoint === "object") {
    					let bp = [];

    					if (typeof breakpoint.span === "number") {
    						bp = [...bp, `bx--col-${name}-${breakpoint.span}`];
    					} else if (breakpoint.span === true) {
    						bp = [...bp, `bx--col-${name}`];
    					}

    					if (typeof breakpoint.offset === "number") {
    						bp = [...bp, `bx--offset-${name}-${breakpoint.offset}`];
    					}

    					return bp.join(" ");
    				}
    			}).filter(Boolean).join(" "));
    		}

    		$$invalidate(1, props = {
    			...$$restProps,
    			class: [
    				$$restProps.class,
    				columnClass,
    				!columnClass && "bx--col",
    				noGutter && "bx--no-gutter",
    				noGutterLeft && "bx--no-gutter--left",
    				noGutterRight && "bx--no-gutter--right",
    				aspectRatio && `bx--aspect-ratio bx--aspect-ratio--${aspectRatio}`,
    				padding && "bx--col-padding"
    			].filter(Boolean).join(" ")
    		});
    	};

    	return [
    		as,
    		props,
    		noGutter,
    		noGutterLeft,
    		noGutterRight,
    		padding,
    		aspectRatio,
    		sm,
    		md,
    		lg,
    		xlg,
    		max,
    		columnClass,
    		$$scope,
    		slots
    	];
    }

    class Column extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {
    			as: 0,
    			noGutter: 2,
    			noGutterLeft: 3,
    			noGutterRight: 4,
    			padding: 5,
    			aspectRatio: 6,
    			sm: 7,
    			md: 8,
    			lg: 9,
    			xlg: 10,
    			max: 11
    		});
    	}
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* node_modules/carbon-components-svelte/src/ImageLoader/ImageLoader.svelte generated by Svelte v3.38.2 */
    const get_error_slot_changes_1 = dirty => ({});
    const get_error_slot_context_1 = ctx => ({});
    const get_loading_slot_changes_1 = dirty => ({});
    const get_loading_slot_context_1 = ctx => ({});
    const get_error_slot_changes = dirty => ({});
    const get_error_slot_context = ctx => ({});
    const get_loading_slot_changes = dirty => ({});
    const get_loading_slot_context = ctx => ({});

    // (95:0) {:else}
    function create_else_block$1(ctx) {
    	let aspectratio;
    	let current;

    	aspectratio = new AspectRatio({
    			props: {
    				ratio: /*ratio*/ ctx[5],
    				$$slots: { default: [create_default_slot$6] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(aspectratio.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(aspectratio, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const aspectratio_changes = {};
    			if (dirty & /*ratio*/ 32) aspectratio_changes.ratio = /*ratio*/ ctx[5];

    			if (dirty & /*$$scope, error, $$restProps, src, alt, fadeIn, loaded, loading*/ 1247) {
    				aspectratio_changes.$$scope = { dirty, ctx };
    			}

    			aspectratio.$set(aspectratio_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(aspectratio.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(aspectratio.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(aspectratio, detaching);
    		}
    	};
    }

    // (79:0) {#if ratio === undefined}
    function create_if_block$5(ctx) {
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let current;
    	let if_block0 = /*loading*/ ctx[2] && create_if_block_3$3(ctx);
    	let if_block1 = /*loaded*/ ctx[0] && create_if_block_2$3(ctx);
    	let if_block2 = /*error*/ ctx[1] && create_if_block_1$4(ctx);

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*loading*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*loading*/ 4) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3$3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*loaded*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*loaded*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2$3(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*error*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*error*/ 2) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_1$4(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(if_block2_anchor);
    		}
    	};
    }

    // (97:4) {#if loading}
    function create_if_block_6$1(ctx) {
    	let current;
    	const loading_slot_template = /*#slots*/ ctx[9].loading;
    	const loading_slot = create_slot(loading_slot_template, ctx, /*$$scope*/ ctx[10], get_loading_slot_context_1);

    	return {
    		c() {
    			if (loading_slot) loading_slot.c();
    		},
    		m(target, anchor) {
    			if (loading_slot) {
    				loading_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (loading_slot) {
    				if (loading_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(loading_slot, loading_slot_template, ctx, /*$$scope*/ ctx[10], dirty, get_loading_slot_changes_1, get_loading_slot_context_1);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(loading_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(loading_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (loading_slot) loading_slot.d(detaching);
    		}
    	};
    }

    // (100:4) {#if loaded}
    function create_if_block_5$1(ctx) {
    	let img;
    	let img_style_value;
    	let img_src_value;
    	let img_transition;
    	let current;

    	let img_levels = [
    		/*$$restProps*/ ctx[7],
    		{
    			style: img_style_value = "width: 100%;" + /*$$restProps*/ ctx[7].style
    		},
    		{ src: img_src_value = /*src*/ ctx[3] },
    		{ alt: /*alt*/ ctx[4] }
    	];

    	let img_data = {};

    	for (let i = 0; i < img_levels.length; i += 1) {
    		img_data = assign(img_data, img_levels[i]);
    	}

    	return {
    		c() {
    			img = element("img");
    			set_attributes(img, img_data);
    		},
    		m(target, anchor) {
    			insert(target, img, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			set_attributes(img, img_data = get_spread_update(img_levels, [
    				dirty & /*$$restProps*/ 128 && /*$$restProps*/ ctx[7],
    				(!current || dirty & /*$$restProps*/ 128 && img_style_value !== (img_style_value = "width: 100%;" + /*$$restProps*/ ctx[7].style)) && { style: img_style_value },
    				(!current || dirty & /*src*/ 8 && img.src !== (img_src_value = /*src*/ ctx[3])) && { src: img_src_value },
    				(!current || dirty & /*alt*/ 16) && { alt: /*alt*/ ctx[4] }
    			]));
    		},
    		i(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!img_transition) img_transition = create_bidirectional_transition(img, fade, { duration: /*fadeIn*/ ctx[6] ? fast02 : 0 }, true);
    				img_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			if (!img_transition) img_transition = create_bidirectional_transition(img, fade, { duration: /*fadeIn*/ ctx[6] ? fast02 : 0 }, false);
    			img_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(img);
    			if (detaching && img_transition) img_transition.end();
    		}
    	};
    }

    // (109:4) {#if error}
    function create_if_block_4$2(ctx) {
    	let current;
    	const error_slot_template = /*#slots*/ ctx[9].error;
    	const error_slot = create_slot(error_slot_template, ctx, /*$$scope*/ ctx[10], get_error_slot_context_1);

    	return {
    		c() {
    			if (error_slot) error_slot.c();
    		},
    		m(target, anchor) {
    			if (error_slot) {
    				error_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (error_slot) {
    				if (error_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(error_slot, error_slot_template, ctx, /*$$scope*/ ctx[10], dirty, get_error_slot_changes_1, get_error_slot_context_1);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(error_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(error_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (error_slot) error_slot.d(detaching);
    		}
    	};
    }

    // (96:2) <AspectRatio ratio="{ratio}">
    function create_default_slot$6(ctx) {
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let current;
    	let if_block0 = /*loading*/ ctx[2] && create_if_block_6$1(ctx);
    	let if_block1 = /*loaded*/ ctx[0] && create_if_block_5$1(ctx);
    	let if_block2 = /*error*/ ctx[1] && create_if_block_4$2(ctx);

    	return {
    		c() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*loading*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*loading*/ 4) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_6$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*loaded*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*loaded*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_5$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*error*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*error*/ 2) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_4$2(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(if_block2_anchor);
    		}
    	};
    }

    // (80:2) {#if loading}
    function create_if_block_3$3(ctx) {
    	let current;
    	const loading_slot_template = /*#slots*/ ctx[9].loading;
    	const loading_slot = create_slot(loading_slot_template, ctx, /*$$scope*/ ctx[10], get_loading_slot_context);

    	return {
    		c() {
    			if (loading_slot) loading_slot.c();
    		},
    		m(target, anchor) {
    			if (loading_slot) {
    				loading_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (loading_slot) {
    				if (loading_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(loading_slot, loading_slot_template, ctx, /*$$scope*/ ctx[10], dirty, get_loading_slot_changes, get_loading_slot_context);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(loading_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(loading_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (loading_slot) loading_slot.d(detaching);
    		}
    	};
    }

    // (83:2) {#if loaded}
    function create_if_block_2$3(ctx) {
    	let img;
    	let img_style_value;
    	let img_src_value;
    	let img_transition;
    	let current;

    	let img_levels = [
    		/*$$restProps*/ ctx[7],
    		{
    			style: img_style_value = "width: 100%;" + /*$$restProps*/ ctx[7].style
    		},
    		{ src: img_src_value = /*src*/ ctx[3] },
    		{ alt: /*alt*/ ctx[4] }
    	];

    	let img_data = {};

    	for (let i = 0; i < img_levels.length; i += 1) {
    		img_data = assign(img_data, img_levels[i]);
    	}

    	return {
    		c() {
    			img = element("img");
    			set_attributes(img, img_data);
    		},
    		m(target, anchor) {
    			insert(target, img, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			set_attributes(img, img_data = get_spread_update(img_levels, [
    				dirty & /*$$restProps*/ 128 && /*$$restProps*/ ctx[7],
    				(!current || dirty & /*$$restProps*/ 128 && img_style_value !== (img_style_value = "width: 100%;" + /*$$restProps*/ ctx[7].style)) && { style: img_style_value },
    				(!current || dirty & /*src*/ 8 && img.src !== (img_src_value = /*src*/ ctx[3])) && { src: img_src_value },
    				(!current || dirty & /*alt*/ 16) && { alt: /*alt*/ ctx[4] }
    			]));
    		},
    		i(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!img_transition) img_transition = create_bidirectional_transition(img, fade, { duration: /*fadeIn*/ ctx[6] ? fast02 : 0 }, true);
    				img_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			if (!img_transition) img_transition = create_bidirectional_transition(img, fade, { duration: /*fadeIn*/ ctx[6] ? fast02 : 0 }, false);
    			img_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(img);
    			if (detaching && img_transition) img_transition.end();
    		}
    	};
    }

    // (92:2) {#if error}
    function create_if_block_1$4(ctx) {
    	let current;
    	const error_slot_template = /*#slots*/ ctx[9].error;
    	const error_slot = create_slot(error_slot_template, ctx, /*$$scope*/ ctx[10], get_error_slot_context);

    	return {
    		c() {
    			if (error_slot) error_slot.c();
    		},
    		m(target, anchor) {
    			if (error_slot) {
    				error_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (error_slot) {
    				if (error_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(error_slot, error_slot_template, ctx, /*$$scope*/ ctx[10], dirty, get_error_slot_changes, get_error_slot_context);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(error_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(error_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (error_slot) error_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$c(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$5, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*ratio*/ ctx[5] === undefined) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    const fast02 = 110;

    function instance$c($$self, $$props, $$invalidate) {
    	const omit_props_names = ["src","alt","ratio","loading","loaded","error","fadeIn","loadImage"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { src = "" } = $$props;
    	let { alt = "" } = $$props;
    	let { ratio = undefined } = $$props;
    	let { loading = false } = $$props;
    	let { loaded = false } = $$props;
    	let { error = false } = $$props;
    	let { fadeIn = false } = $$props;

    	const loadImage = url => {
    		if (image != null) image = null;
    		$$invalidate(0, loaded = false);
    		$$invalidate(1, error = false);
    		image = new Image();
    		image.src = url || src;
    		image.onload = () => $$invalidate(0, loaded = true);
    		image.onerror = () => $$invalidate(1, error = true);
    	};

    	const dispatch = createEventDispatcher();
    	let image = null;

    	onMount(() => {
    		return () => image = null;
    	});

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(7, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("src" in $$new_props) $$invalidate(3, src = $$new_props.src);
    		if ("alt" in $$new_props) $$invalidate(4, alt = $$new_props.alt);
    		if ("ratio" in $$new_props) $$invalidate(5, ratio = $$new_props.ratio);
    		if ("loading" in $$new_props) $$invalidate(2, loading = $$new_props.loading);
    		if ("loaded" in $$new_props) $$invalidate(0, loaded = $$new_props.loaded);
    		if ("error" in $$new_props) $$invalidate(1, error = $$new_props.error);
    		if ("fadeIn" in $$new_props) $$invalidate(6, fadeIn = $$new_props.fadeIn);
    		if ("$$scope" in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*loaded, error*/ 3) {
    			$$invalidate(2, loading = !loaded && !error);
    		}

    		if ($$self.$$.dirty & /*src*/ 8) {
    			if (src) loadImage();
    		}

    		if ($$self.$$.dirty & /*loaded*/ 1) {
    			if (loaded) dispatch("load");
    		}

    		if ($$self.$$.dirty & /*error*/ 2) {
    			if (error) dispatch("error");
    		}
    	};

    	return [
    		loaded,
    		error,
    		loading,
    		src,
    		alt,
    		ratio,
    		fadeIn,
    		$$restProps,
    		loadImage,
    		slots,
    		$$scope
    	];
    }

    class ImageLoader extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {
    			src: 3,
    			alt: 4,
    			ratio: 5,
    			loading: 2,
    			loaded: 0,
    			error: 1,
    			fadeIn: 6,
    			loadImage: 8
    		});
    	}

    	get loadImage() {
    		return this.$$.ctx[8];
    	}
    }

    /* node_modules/carbon-components-svelte/src/Modal/Modal.svelte generated by Svelte v3.38.2 */
    const get_heading_slot_changes = dirty => ({});
    const get_heading_slot_context = ctx => ({});
    const get_label_slot_changes = dirty => ({});
    const get_label_slot_context = ctx => ({});

    // (180:6) {#if passiveModal}
    function create_if_block_4$1(ctx) {
    	let button;
    	let close20;
    	let current;
    	let mounted;
    	let dispose;

    	close20 = new Close20({
    			props: {
    				"aria-label": /*iconDescription*/ ctx[7],
    				class: "bx--modal-close__icon"
    			}
    		});

    	return {
    		c() {
    			button = element("button");
    			create_component(close20.$$.fragment);
    			attr(button, "type", "button");
    			attr(button, "aria-label", /*iconDescription*/ ctx[7]);
    			attr(button, "title", /*iconDescription*/ ctx[7]);
    			toggle_class(button, "bx--modal-close", true);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			mount_component(close20, button, null);
    			/*button_binding*/ ctx[35](button);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler_1*/ ctx[36]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			const close20_changes = {};
    			if (dirty[0] & /*iconDescription*/ 128) close20_changes["aria-label"] = /*iconDescription*/ ctx[7];
    			close20.$set(close20_changes);

    			if (!current || dirty[0] & /*iconDescription*/ 128) {
    				attr(button, "aria-label", /*iconDescription*/ ctx[7]);
    			}

    			if (!current || dirty[0] & /*iconDescription*/ 128) {
    				attr(button, "title", /*iconDescription*/ ctx[7]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(close20.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(close20.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			destroy_component(close20);
    			/*button_binding*/ ctx[35](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (197:6) {#if modalLabel}
    function create_if_block_3$2(ctx) {
    	let h2;
    	let current;
    	const label_slot_template = /*#slots*/ ctx[29].label;
    	const label_slot = create_slot(label_slot_template, ctx, /*$$scope*/ ctx[47], get_label_slot_context);
    	const label_slot_or_fallback = label_slot || fallback_block_1(ctx);

    	return {
    		c() {
    			h2 = element("h2");
    			if (label_slot_or_fallback) label_slot_or_fallback.c();
    			attr(h2, "id", /*modalLabelId*/ ctx[21]);
    			toggle_class(h2, "bx--modal-header__label", true);
    		},
    		m(target, anchor) {
    			insert(target, h2, anchor);

    			if (label_slot_or_fallback) {
    				label_slot_or_fallback.m(h2, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (label_slot) {
    				if (label_slot.p && (!current || dirty[1] & /*$$scope*/ 65536)) {
    					update_slot(label_slot, label_slot_template, ctx, /*$$scope*/ ctx[47], dirty, get_label_slot_changes, get_label_slot_context);
    				}
    			} else {
    				if (label_slot_or_fallback && label_slot_or_fallback.p && dirty[0] & /*modalLabel*/ 64) {
    					label_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			if (!current || dirty[0] & /*modalLabelId*/ 2097152) {
    				attr(h2, "id", /*modalLabelId*/ ctx[21]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(label_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(label_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h2);
    			if (label_slot_or_fallback) label_slot_or_fallback.d(detaching);
    		}
    	};
    }

    // (199:29) {modalLabel}
    function fallback_block_1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*modalLabel*/ ctx[6]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*modalLabel*/ 64) set_data(t, /*modalLabel*/ ctx[6]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (203:29) {modalHeading}
    function fallback_block$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*modalHeading*/ ctx[5]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*modalHeading*/ 32) set_data(t, /*modalHeading*/ ctx[5]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (205:6) {#if !passiveModal}
    function create_if_block_2$2(ctx) {
    	let button;
    	let close20;
    	let current;
    	let mounted;
    	let dispose;

    	close20 = new Close20({
    			props: {
    				"aria-label": /*iconDescription*/ ctx[7],
    				class: "bx--modal-close__icon"
    			}
    		});

    	return {
    		c() {
    			button = element("button");
    			create_component(close20.$$.fragment);
    			attr(button, "type", "button");
    			attr(button, "aria-label", /*iconDescription*/ ctx[7]);
    			attr(button, "title", /*iconDescription*/ ctx[7]);
    			toggle_class(button, "bx--modal-close", true);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			mount_component(close20, button, null);
    			/*button_binding_1*/ ctx[37](button);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler_2*/ ctx[38]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			const close20_changes = {};
    			if (dirty[0] & /*iconDescription*/ 128) close20_changes["aria-label"] = /*iconDescription*/ ctx[7];
    			close20.$set(close20_changes);

    			if (!current || dirty[0] & /*iconDescription*/ 128) {
    				attr(button, "aria-label", /*iconDescription*/ ctx[7]);
    			}

    			if (!current || dirty[0] & /*iconDescription*/ 128) {
    				attr(button, "title", /*iconDescription*/ ctx[7]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(close20.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(close20.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			destroy_component(close20);
    			/*button_binding_1*/ ctx[37](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (235:4) {#if hasScrollingContent}
    function create_if_block_1$3(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			toggle_class(div, "bx--modal-content--overflow-indicator", true);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (238:4) {#if !passiveModal}
    function create_if_block$4(ctx) {
    	let div;
    	let button0;
    	let t;
    	let button1;
    	let current;

    	button0 = new Button({
    			props: {
    				kind: "secondary",
    				$$slots: { default: [create_default_slot_1$3] },
    				$$scope: { ctx }
    			}
    		});

    	button0.$on("click", /*click_handler_3*/ ctx[39]);

    	button1 = new Button({
    			props: {
    				kind: /*danger*/ ctx[3] ? "danger" : "primary",
    				disabled: /*primaryButtonDisabled*/ ctx[11],
    				$$slots: { default: [create_default_slot$5] },
    				$$scope: { ctx }
    			}
    		});

    	button1.$on("click", /*click_handler_4*/ ctx[40]);

    	return {
    		c() {
    			div = element("div");
    			create_component(button0.$$.fragment);
    			t = space();
    			create_component(button1.$$.fragment);
    			toggle_class(div, "bx--modal-footer", true);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(button0, div, null);
    			append(div, t);
    			mount_component(button1, div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button0_changes = {};

    			if (dirty[0] & /*secondaryButtonText*/ 8192 | dirty[1] & /*$$scope*/ 65536) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};
    			if (dirty[0] & /*danger*/ 8) button1_changes.kind = /*danger*/ ctx[3] ? "danger" : "primary";
    			if (dirty[0] & /*primaryButtonDisabled*/ 2048) button1_changes.disabled = /*primaryButtonDisabled*/ ctx[11];

    			if (dirty[0] & /*primaryButtonText*/ 1024 | dirty[1] & /*$$scope*/ 65536) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(button0);
    			destroy_component(button1);
    		}
    	};
    }

    // (240:8) <Button           kind="secondary"           on:click="{() => {             dispatch('click:button--secondary');           }}"         >
    function create_default_slot_1$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*secondaryButtonText*/ ctx[13]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*secondaryButtonText*/ 8192) set_data(t, /*secondaryButtonText*/ ctx[13]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (248:8) <Button           kind="{danger ? 'danger' : 'primary'}"           disabled="{primaryButtonDisabled}"           on:click="{() => {             dispatch('submit');           }}"         >
    function create_default_slot$5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*primaryButtonText*/ ctx[10]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*primaryButtonText*/ 1024) set_data(t, /*primaryButtonText*/ ctx[10]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let t0;
    	let t1;
    	let h3;
    	let t2;
    	let t3;
    	let div1;
    	let div1_tabindex_value;
    	let div1_role_value;
    	let div1_aria_label_value;
    	let div1_aria_labelledby_value;
    	let t4;
    	let t5;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*passiveModal*/ ctx[4] && create_if_block_4$1(ctx);
    	let if_block1 = /*modalLabel*/ ctx[6] && create_if_block_3$2(ctx);
    	const heading_slot_template = /*#slots*/ ctx[29].heading;
    	const heading_slot = create_slot(heading_slot_template, ctx, /*$$scope*/ ctx[47], get_heading_slot_context);
    	const heading_slot_or_fallback = heading_slot || fallback_block$1(ctx);
    	let if_block2 = !/*passiveModal*/ ctx[4] && create_if_block_2$2(ctx);
    	const default_slot_template = /*#slots*/ ctx[29].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[47], null);
    	let if_block3 = /*hasScrollingContent*/ ctx[9] && create_if_block_1$3();
    	let if_block4 = !/*passiveModal*/ ctx[4] && create_if_block$4(ctx);

    	let div2_levels = [
    		{ role: "dialog" },
    		{ tabindex: "-1" },
    		/*alertDialogProps*/ ctx[20],
    		{ "aria-modal": "true" },
    		{ "aria-label": /*ariaLabel*/ ctx[23] }
    	];

    	let div2_data = {};

    	for (let i = 0; i < div2_levels.length; i += 1) {
    		div2_data = assign(div2_data, div2_levels[i]);
    	}

    	let div3_levels = [{ role: "presentation" }, { id: /*id*/ ctx[15] }, /*$$restProps*/ ctx[25]];
    	let div3_data = {};

    	for (let i = 0; i < div3_levels.length; i += 1) {
    		div3_data = assign(div3_data, div3_levels[i]);
    	}

    	return {
    		c() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			h3 = element("h3");
    			if (heading_slot_or_fallback) heading_slot_or_fallback.c();
    			t2 = space();
    			if (if_block2) if_block2.c();
    			t3 = space();
    			div1 = element("div");
    			if (default_slot) default_slot.c();
    			t4 = space();
    			if (if_block3) if_block3.c();
    			t5 = space();
    			if (if_block4) if_block4.c();
    			attr(h3, "id", /*modalHeadingId*/ ctx[22]);
    			toggle_class(h3, "bx--modal-header__heading", true);
    			toggle_class(div0, "bx--modal-header", true);
    			attr(div1, "id", /*modalBodyId*/ ctx[16]);
    			attr(div1, "tabindex", div1_tabindex_value = /*hasScrollingContent*/ ctx[9] ? "0" : undefined);
    			attr(div1, "role", div1_role_value = /*hasScrollingContent*/ ctx[9] ? "region" : undefined);

    			attr(div1, "aria-label", div1_aria_label_value = /*hasScrollingContent*/ ctx[9]
    			? /*ariaLabel*/ ctx[23]
    			: undefined);

    			attr(div1, "aria-labelledby", div1_aria_labelledby_value = /*modalLabel*/ ctx[6]
    			? /*modalLabelId*/ ctx[21]
    			: /*modalHeadingId*/ ctx[22]);

    			toggle_class(div1, "bx--modal-content", true);
    			toggle_class(div1, "bx--modal-content--with-form", /*hasForm*/ ctx[8]);
    			toggle_class(div1, "bx--modal-scroll-content", /*hasScrollingContent*/ ctx[9]);
    			set_attributes(div2, div2_data);
    			toggle_class(div2, "bx--modal-container", true);
    			toggle_class(div2, "bx--modal-container--xs", /*size*/ ctx[2] === "xs");
    			toggle_class(div2, "bx--modal-container--sm", /*size*/ ctx[2] === "sm");
    			toggle_class(div2, "bx--modal-container--lg", /*size*/ ctx[2] === "lg");
    			set_attributes(div3, div3_data);
    			toggle_class(div3, "bx--modal", true);
    			toggle_class(div3, "bx--modal-tall", !/*passiveModal*/ ctx[4]);
    			toggle_class(div3, "is-visible", /*open*/ ctx[0]);
    			toggle_class(div3, "bx--modal--danger", /*danger*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div2);
    			append(div2, div0);
    			if (if_block0) if_block0.m(div0, null);
    			append(div0, t0);
    			if (if_block1) if_block1.m(div0, null);
    			append(div0, t1);
    			append(div0, h3);

    			if (heading_slot_or_fallback) {
    				heading_slot_or_fallback.m(h3, null);
    			}

    			append(div0, t2);
    			if (if_block2) if_block2.m(div0, null);
    			append(div2, t3);
    			append(div2, div1);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			append(div2, t4);
    			if (if_block3) if_block3.m(div2, null);
    			append(div2, t5);
    			if (if_block4) if_block4.m(div2, null);
    			/*div2_binding*/ ctx[41](div2);
    			/*div3_binding*/ ctx[43](div3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(div2, "click", /*click_handler_5*/ ctx[42]),
    					listen(div3, "keydown", /*keydown_handler*/ ctx[30]),
    					listen(div3, "keydown", /*keydown_handler_1*/ ctx[44]),
    					listen(div3, "click", /*click_handler*/ ctx[31]),
    					listen(div3, "click", /*click_handler_6*/ ctx[45]),
    					listen(div3, "mouseover", /*mouseover_handler*/ ctx[32]),
    					listen(div3, "mouseenter", /*mouseenter_handler*/ ctx[33]),
    					listen(div3, "mouseleave", /*mouseleave_handler*/ ctx[34]),
    					listen(div3, "transitionend", /*transitionend_handler*/ ctx[46])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*passiveModal*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*passiveModal*/ 16) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_4$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div0, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*modalLabel*/ ctx[6]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*modalLabel*/ 64) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_3$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div0, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (heading_slot) {
    				if (heading_slot.p && (!current || dirty[1] & /*$$scope*/ 65536)) {
    					update_slot(heading_slot, heading_slot_template, ctx, /*$$scope*/ ctx[47], dirty, get_heading_slot_changes, get_heading_slot_context);
    				}
    			} else {
    				if (heading_slot_or_fallback && heading_slot_or_fallback.p && dirty[0] & /*modalHeading*/ 32) {
    					heading_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			if (!current || dirty[0] & /*modalHeadingId*/ 4194304) {
    				attr(h3, "id", /*modalHeadingId*/ ctx[22]);
    			}

    			if (!/*passiveModal*/ ctx[4]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*passiveModal*/ 16) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_2$2(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div0, null);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[1] & /*$$scope*/ 65536)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[47], dirty, null, null);
    				}
    			}

    			if (!current || dirty[0] & /*modalBodyId*/ 65536) {
    				attr(div1, "id", /*modalBodyId*/ ctx[16]);
    			}

    			if (!current || dirty[0] & /*hasScrollingContent*/ 512 && div1_tabindex_value !== (div1_tabindex_value = /*hasScrollingContent*/ ctx[9] ? "0" : undefined)) {
    				attr(div1, "tabindex", div1_tabindex_value);
    			}

    			if (!current || dirty[0] & /*hasScrollingContent*/ 512 && div1_role_value !== (div1_role_value = /*hasScrollingContent*/ ctx[9] ? "region" : undefined)) {
    				attr(div1, "role", div1_role_value);
    			}

    			if (!current || dirty[0] & /*hasScrollingContent, ariaLabel*/ 8389120 && div1_aria_label_value !== (div1_aria_label_value = /*hasScrollingContent*/ ctx[9]
    			? /*ariaLabel*/ ctx[23]
    			: undefined)) {
    				attr(div1, "aria-label", div1_aria_label_value);
    			}

    			if (!current || dirty[0] & /*modalLabel, modalLabelId, modalHeadingId*/ 6291520 && div1_aria_labelledby_value !== (div1_aria_labelledby_value = /*modalLabel*/ ctx[6]
    			? /*modalLabelId*/ ctx[21]
    			: /*modalHeadingId*/ ctx[22])) {
    				attr(div1, "aria-labelledby", div1_aria_labelledby_value);
    			}

    			if (dirty[0] & /*hasForm*/ 256) {
    				toggle_class(div1, "bx--modal-content--with-form", /*hasForm*/ ctx[8]);
    			}

    			if (dirty[0] & /*hasScrollingContent*/ 512) {
    				toggle_class(div1, "bx--modal-scroll-content", /*hasScrollingContent*/ ctx[9]);
    			}

    			if (/*hasScrollingContent*/ ctx[9]) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block_1$3();
    					if_block3.c();
    					if_block3.m(div2, t5);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (!/*passiveModal*/ ctx[4]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);

    					if (dirty[0] & /*passiveModal*/ 16) {
    						transition_in(if_block4, 1);
    					}
    				} else {
    					if_block4 = create_if_block$4(ctx);
    					if_block4.c();
    					transition_in(if_block4, 1);
    					if_block4.m(div2, null);
    				}
    			} else if (if_block4) {
    				group_outros();

    				transition_out(if_block4, 1, 1, () => {
    					if_block4 = null;
    				});

    				check_outros();
    			}

    			set_attributes(div2, div2_data = get_spread_update(div2_levels, [
    				{ role: "dialog" },
    				{ tabindex: "-1" },
    				dirty[0] & /*alertDialogProps*/ 1048576 && /*alertDialogProps*/ ctx[20],
    				{ "aria-modal": "true" },
    				(!current || dirty[0] & /*ariaLabel*/ 8388608) && { "aria-label": /*ariaLabel*/ ctx[23] }
    			]));

    			toggle_class(div2, "bx--modal-container", true);
    			toggle_class(div2, "bx--modal-container--xs", /*size*/ ctx[2] === "xs");
    			toggle_class(div2, "bx--modal-container--sm", /*size*/ ctx[2] === "sm");
    			toggle_class(div2, "bx--modal-container--lg", /*size*/ ctx[2] === "lg");

    			set_attributes(div3, div3_data = get_spread_update(div3_levels, [
    				{ role: "presentation" },
    				(!current || dirty[0] & /*id*/ 32768) && { id: /*id*/ ctx[15] },
    				dirty[0] & /*$$restProps*/ 33554432 && /*$$restProps*/ ctx[25]
    			]));

    			toggle_class(div3, "bx--modal", true);
    			toggle_class(div3, "bx--modal-tall", !/*passiveModal*/ ctx[4]);
    			toggle_class(div3, "is-visible", /*open*/ ctx[0]);
    			toggle_class(div3, "bx--modal--danger", /*danger*/ ctx[3]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(heading_slot_or_fallback, local);
    			transition_in(if_block2);
    			transition_in(default_slot, local);
    			transition_in(if_block4);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(heading_slot_or_fallback, local);
    			transition_out(if_block2);
    			transition_out(default_slot, local);
    			transition_out(if_block4);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div3);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (heading_slot_or_fallback) heading_slot_or_fallback.d(detaching);
    			if (if_block2) if_block2.d();
    			if (default_slot) default_slot.d(detaching);
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			/*div2_binding*/ ctx[41](null);
    			/*div3_binding*/ ctx[43](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let modalLabelId;
    	let modalHeadingId;
    	let modalBodyId;
    	let ariaLabel;

    	const omit_props_names = [
    		"size","open","danger","alert","passiveModal","modalHeading","modalLabel","modalAriaLabel","iconDescription","hasForm","hasScrollingContent","primaryButtonText","primaryButtonDisabled","shouldSubmitOnEnter","secondaryButtonText","selectorPrimaryFocus","preventCloseOnClickOutside","id","ref"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { size = undefined } = $$props;
    	let { open = false } = $$props;
    	let { danger = false } = $$props;
    	let { alert = false } = $$props;
    	let { passiveModal = false } = $$props;
    	let { modalHeading = undefined } = $$props;
    	let { modalLabel = undefined } = $$props;
    	let { modalAriaLabel = undefined } = $$props;
    	let { iconDescription = "Close the modal" } = $$props;
    	let { hasForm = false } = $$props;
    	let { hasScrollingContent = false } = $$props;
    	let { primaryButtonText = "" } = $$props;
    	let { primaryButtonDisabled = false } = $$props;
    	let { shouldSubmitOnEnter = true } = $$props;
    	let { secondaryButtonText = "" } = $$props;
    	let { selectorPrimaryFocus = "[data-modal-primary-focus]" } = $$props;
    	let { preventCloseOnClickOutside = false } = $$props;
    	let { id = "ccs-" + Math.random().toString(36) } = $$props;
    	let { ref = null } = $$props;
    	const dispatch = createEventDispatcher();
    	let buttonRef = null;
    	let innerModal = null;
    	let opened = false;
    	let didClickInnerModal = false;

    	function focus(element) {
    		const node = (element || innerModal).querySelector(selectorPrimaryFocus) || buttonRef;
    		node.focus();
    	}

    	onMount(() => {
    		return () => {
    			document.body.classList.remove("bx--body--with-modal-open");
    		};
    	});

    	afterUpdate(() => {
    		if (opened) {
    			if (!open) {
    				opened = false;
    				dispatch("close");
    				document.body.classList.remove("bx--body--with-modal-open");
    			}
    		} else if (open) {
    			opened = true;
    			focus();
    			dispatch("open");
    			document.body.classList.add("bx--body--with-modal-open");
    		}
    	});

    	let alertDialogProps = {};

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function button_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			buttonRef = $$value;
    			$$invalidate(17, buttonRef);
    		});
    	}

    	const click_handler_1 = () => {
    		$$invalidate(0, open = false);
    	};

    	function button_binding_1($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			buttonRef = $$value;
    			$$invalidate(17, buttonRef);
    		});
    	}

    	const click_handler_2 = () => {
    		$$invalidate(0, open = false);
    	};

    	const click_handler_3 = () => {
    		dispatch("click:button--secondary");
    	};

    	const click_handler_4 = () => {
    		dispatch("submit");
    	};

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			innerModal = $$value;
    			$$invalidate(18, innerModal);
    		});
    	}

    	const click_handler_5 = () => {
    		$$invalidate(19, didClickInnerModal = true);
    	};

    	function div3_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			ref = $$value;
    			$$invalidate(1, ref);
    		});
    	}

    	const keydown_handler_1 = ({ key }) => {
    		if (open) {
    			if (key === "Escape") {
    				$$invalidate(0, open = false);
    			} else if (shouldSubmitOnEnter && key === "Enter") {
    				dispatch("submit");
    			}
    		}
    	};

    	const click_handler_6 = () => {
    		if (!didClickInnerModal && !preventCloseOnClickOutside) $$invalidate(0, open = false);
    		$$invalidate(19, didClickInnerModal = false);
    	};

    	const transitionend_handler = e => {
    		if (e.propertyName === "transform") {
    			dispatch("transitionend", { open });
    		}
    	};

    	$$self.$$set = $$new_props => {
    		$$invalidate(50, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		$$invalidate(25, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("size" in $$new_props) $$invalidate(2, size = $$new_props.size);
    		if ("open" in $$new_props) $$invalidate(0, open = $$new_props.open);
    		if ("danger" in $$new_props) $$invalidate(3, danger = $$new_props.danger);
    		if ("alert" in $$new_props) $$invalidate(26, alert = $$new_props.alert);
    		if ("passiveModal" in $$new_props) $$invalidate(4, passiveModal = $$new_props.passiveModal);
    		if ("modalHeading" in $$new_props) $$invalidate(5, modalHeading = $$new_props.modalHeading);
    		if ("modalLabel" in $$new_props) $$invalidate(6, modalLabel = $$new_props.modalLabel);
    		if ("modalAriaLabel" in $$new_props) $$invalidate(27, modalAriaLabel = $$new_props.modalAriaLabel);
    		if ("iconDescription" in $$new_props) $$invalidate(7, iconDescription = $$new_props.iconDescription);
    		if ("hasForm" in $$new_props) $$invalidate(8, hasForm = $$new_props.hasForm);
    		if ("hasScrollingContent" in $$new_props) $$invalidate(9, hasScrollingContent = $$new_props.hasScrollingContent);
    		if ("primaryButtonText" in $$new_props) $$invalidate(10, primaryButtonText = $$new_props.primaryButtonText);
    		if ("primaryButtonDisabled" in $$new_props) $$invalidate(11, primaryButtonDisabled = $$new_props.primaryButtonDisabled);
    		if ("shouldSubmitOnEnter" in $$new_props) $$invalidate(12, shouldSubmitOnEnter = $$new_props.shouldSubmitOnEnter);
    		if ("secondaryButtonText" in $$new_props) $$invalidate(13, secondaryButtonText = $$new_props.secondaryButtonText);
    		if ("selectorPrimaryFocus" in $$new_props) $$invalidate(28, selectorPrimaryFocus = $$new_props.selectorPrimaryFocus);
    		if ("preventCloseOnClickOutside" in $$new_props) $$invalidate(14, preventCloseOnClickOutside = $$new_props.preventCloseOnClickOutside);
    		if ("id" in $$new_props) $$invalidate(15, id = $$new_props.id);
    		if ("ref" in $$new_props) $$invalidate(1, ref = $$new_props.ref);
    		if ("$$scope" in $$new_props) $$invalidate(47, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*id*/ 32768) {
    			$$invalidate(21, modalLabelId = `bx--modal-header__label--modal-${id}`);
    		}

    		if ($$self.$$.dirty[0] & /*id*/ 32768) {
    			$$invalidate(22, modalHeadingId = `bx--modal-header__heading--modal-${id}`);
    		}

    		if ($$self.$$.dirty[0] & /*id*/ 32768) {
    			$$invalidate(16, modalBodyId = `bx--modal-body--${id}`);
    		}

    		$$invalidate(23, ariaLabel = modalLabel || $$props["aria-label"] || modalAriaLabel || modalHeading);

    		if ($$self.$$.dirty[0] & /*alert, passiveModal, modalBodyId*/ 67174416) {
    			if (alert) {
    				if (passiveModal) {
    					$$invalidate(20, alertDialogProps.role = "alert", alertDialogProps);
    				}

    				if (!passiveModal) {
    					$$invalidate(20, alertDialogProps.role = "alertdialog", alertDialogProps);
    					$$invalidate(20, alertDialogProps["aria-describedby"] = modalBodyId, alertDialogProps);
    				}
    			}
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		open,
    		ref,
    		size,
    		danger,
    		passiveModal,
    		modalHeading,
    		modalLabel,
    		iconDescription,
    		hasForm,
    		hasScrollingContent,
    		primaryButtonText,
    		primaryButtonDisabled,
    		shouldSubmitOnEnter,
    		secondaryButtonText,
    		preventCloseOnClickOutside,
    		id,
    		modalBodyId,
    		buttonRef,
    		innerModal,
    		didClickInnerModal,
    		alertDialogProps,
    		modalLabelId,
    		modalHeadingId,
    		ariaLabel,
    		dispatch,
    		$$restProps,
    		alert,
    		modalAriaLabel,
    		selectorPrimaryFocus,
    		slots,
    		keydown_handler,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		button_binding,
    		click_handler_1,
    		button_binding_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		div2_binding,
    		click_handler_5,
    		div3_binding,
    		keydown_handler_1,
    		click_handler_6,
    		transitionend_handler,
    		$$scope
    	];
    }

    class Modal extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$b,
    			create_fragment$b,
    			safe_not_equal,
    			{
    				size: 2,
    				open: 0,
    				danger: 3,
    				alert: 26,
    				passiveModal: 4,
    				modalHeading: 5,
    				modalLabel: 6,
    				modalAriaLabel: 27,
    				iconDescription: 7,
    				hasForm: 8,
    				hasScrollingContent: 9,
    				primaryButtonText: 10,
    				primaryButtonDisabled: 11,
    				shouldSubmitOnEnter: 12,
    				secondaryButtonText: 13,
    				selectorPrimaryFocus: 28,
    				preventCloseOnClickOutside: 14,
    				id: 15,
    				ref: 1
    			},
    			[-1, -1]
    		);
    	}
    }

    /* node_modules/carbon-icons-svelte/lib/CaretLeft16/CaretLeft16.svelte generated by Svelte v3.38.2 */

    function create_if_block$3(ctx) {
    	let title_1;
    	let t;

    	return {
    		c() {
    			title_1 = svg_element("title");
    			t = text(/*title*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, title_1, anchor);
    			append(title_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 4) set_data(t, /*title*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(title_1);
    		}
    	};
    }

    // (38:8)      
    function fallback_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*title*/ ctx[2] && create_if_block$3(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*title*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$a(ctx) {
    	let svg;
    	let path;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);
    	const default_slot_or_fallback = default_slot || fallback_block(ctx);

    	let svg_levels = [
    		{ "data-carbon-icon": "CaretLeft16" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 32 32" },
    		{ fill: "currentColor" },
    		{ width: "16" },
    		{ height: "16" },
    		{ class: /*className*/ ctx[0] },
    		{ preserveAspectRatio: "xMidYMid meet" },
    		{ style: /*style*/ ctx[3] },
    		{ id: /*id*/ ctx[1] },
    		/*attributes*/ ctx[4]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	return {
    		c() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr(path, "d", "M20 24L10 16 20 8z");
    			set_svg_attributes(svg, svg_data);
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(svg, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(svg, "click", /*click_handler*/ ctx[12]),
    					listen(svg, "mouseover", /*mouseover_handler*/ ctx[13]),
    					listen(svg, "mouseenter", /*mouseenter_handler*/ ctx[14]),
    					listen(svg, "mouseleave", /*mouseleave_handler*/ ctx[15]),
    					listen(svg, "keyup", /*keyup_handler*/ ctx[16]),
    					listen(svg, "keydown", /*keydown_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[10], dirty, null, null);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*title*/ 4) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "data-carbon-icon": "CaretLeft16" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 32 32" },
    				{ fill: "currentColor" },
    				{ width: "16" },
    				{ height: "16" },
    				(!current || dirty & /*className*/ 1) && { class: /*className*/ ctx[0] },
    				{ preserveAspectRatio: "xMidYMid meet" },
    				(!current || dirty & /*style*/ 8) && { style: /*style*/ ctx[3] },
    				(!current || dirty & /*id*/ 2) && { id: /*id*/ ctx[1] },
    				dirty & /*attributes*/ 16 && /*attributes*/ ctx[4]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(svg);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let ariaLabel;
    	let ariaLabelledBy;
    	let labelled;
    	let attributes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: className = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { tabindex = undefined } = $$props;
    	let { focusable = false } = $$props;
    	let { title = undefined } = $$props;
    	let { style = undefined } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseover_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseenter_handler(event) {
    		bubble($$self, event);
    	}

    	function mouseleave_handler(event) {
    		bubble($$self, event);
    	}

    	function keyup_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(18, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("class" in $$new_props) $$invalidate(0, className = $$new_props.class);
    		if ("id" in $$new_props) $$invalidate(1, id = $$new_props.id);
    		if ("tabindex" in $$new_props) $$invalidate(5, tabindex = $$new_props.tabindex);
    		if ("focusable" in $$new_props) $$invalidate(6, focusable = $$new_props.focusable);
    		if ("title" in $$new_props) $$invalidate(2, title = $$new_props.title);
    		if ("style" in $$new_props) $$invalidate(3, style = $$new_props.style);
    		if ("$$scope" in $$new_props) $$invalidate(10, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		$$invalidate(7, ariaLabel = $$props["aria-label"]);
    		$$invalidate(8, ariaLabelledBy = $$props["aria-labelledby"]);

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, title*/ 388) {
    			$$invalidate(9, labelled = ariaLabel || ariaLabelledBy || title);
    		}

    		if ($$self.$$.dirty & /*ariaLabel, ariaLabelledBy, labelled, tabindex, focusable*/ 992) {
    			$$invalidate(4, attributes = {
    				"aria-label": ariaLabel,
    				"aria-labelledby": ariaLabelledBy,
    				"aria-hidden": labelled ? undefined : true,
    				role: labelled ? "img" : undefined,
    				focusable: tabindex === "0" ? true : focusable,
    				tabindex
    			});
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		className,
    		id,
    		title,
    		style,
    		attributes,
    		tabindex,
    		focusable,
    		ariaLabel,
    		ariaLabelledBy,
    		labelled,
    		$$scope,
    		slots,
    		click_handler,
    		mouseover_handler,
    		mouseenter_handler,
    		mouseleave_handler,
    		keyup_handler,
    		keydown_handler
    	];
    }

    class CaretLeft16 extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {
    			class: 0,
    			id: 1,
    			tabindex: 5,
    			focusable: 6,
    			title: 2,
    			style: 3
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/Select/Select.svelte generated by Svelte v3.38.2 */

    function create_if_block_10(ctx) {
    	let label;
    	let t;

    	return {
    		c() {
    			label = element("label");
    			t = text(/*labelText*/ ctx[13]);
    			attr(label, "for", /*id*/ ctx[5]);
    			toggle_class(label, "bx--label", true);
    			toggle_class(label, "bx--visually-hidden", /*hideLabel*/ ctx[14]);
    			toggle_class(label, "bx--label--disabled", /*disabled*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*labelText*/ 8192) set_data(t, /*labelText*/ ctx[13]);

    			if (dirty & /*id*/ 32) {
    				attr(label, "for", /*id*/ ctx[5]);
    			}

    			if (dirty & /*hideLabel*/ 16384) {
    				toggle_class(label, "bx--visually-hidden", /*hideLabel*/ ctx[14]);
    			}

    			if (dirty & /*disabled*/ 16) {
    				toggle_class(label, "bx--label--disabled", /*disabled*/ ctx[4]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(label);
    		}
    	};
    }

    // (102:4) {#if inline}
    function create_if_block_6(ctx) {
    	let div1;
    	let div0;
    	let select;
    	let select_aria_describedby_value;
    	let select_aria_invalid_value;
    	let select_disabled_value;
    	let select_class_value;
    	let t0;
    	let chevrondown16;
    	let t1;
    	let div0_data_invalid_value;
    	let t2;
    	let t3;
    	let if_block2_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[20].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[19], null);
    	chevrondown16 = new ChevronDown16({ props: { class: "bx--select__arrow" } });
    	let if_block0 = /*invalid*/ ctx[7] && create_if_block_9();
    	let if_block1 = /*invalid*/ ctx[7] && create_if_block_8(ctx);
    	let if_block2 = /*helperText*/ ctx[11] && create_if_block_7(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			select = element("select");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			create_component(chevrondown16.$$.fragment);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			attr(select, "aria-describedby", select_aria_describedby_value = /*invalid*/ ctx[7] ? /*errorId*/ ctx[15] : undefined);
    			attr(select, "aria-invalid", select_aria_invalid_value = /*invalid*/ ctx[7] || undefined);
    			select.disabled = select_disabled_value = /*disabled*/ ctx[4] || undefined;
    			attr(select, "id", /*id*/ ctx[5]);
    			attr(select, "name", /*name*/ ctx[6]);
    			attr(select, "class", select_class_value = /*size*/ ctx[1] && `bx--select-input--${/*size*/ ctx[1]}`);
    			toggle_class(select, "bx--select-input", true);
    			attr(div0, "data-invalid", div0_data_invalid_value = /*invalid*/ ctx[7] || undefined);
    			toggle_class(div0, "bx--select-input__wrapper", true);
    			toggle_class(div1, "bx--select-input--inline__wrapper", true);
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, select);

    			if (default_slot) {
    				default_slot.m(select, null);
    			}

    			/*select_binding*/ ctx[23](select);
    			append(div0, t0);
    			mount_component(chevrondown16, div0, null);
    			append(div0, t1);
    			if (if_block0) if_block0.m(div0, null);
    			append(div1, t2);
    			if (if_block1) if_block1.m(div1, null);
    			insert(target, t3, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, if_block2_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(select, "change", /*change_handler*/ ctx[24]),
    					listen(select, "blur", /*blur_handler*/ ctx[22])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 524288)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[19], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*invalid, errorId*/ 32896 && select_aria_describedby_value !== (select_aria_describedby_value = /*invalid*/ ctx[7] ? /*errorId*/ ctx[15] : undefined)) {
    				attr(select, "aria-describedby", select_aria_describedby_value);
    			}

    			if (!current || dirty & /*invalid*/ 128 && select_aria_invalid_value !== (select_aria_invalid_value = /*invalid*/ ctx[7] || undefined)) {
    				attr(select, "aria-invalid", select_aria_invalid_value);
    			}

    			if (!current || dirty & /*disabled*/ 16 && select_disabled_value !== (select_disabled_value = /*disabled*/ ctx[4] || undefined)) {
    				select.disabled = select_disabled_value;
    			}

    			if (!current || dirty & /*id*/ 32) {
    				attr(select, "id", /*id*/ ctx[5]);
    			}

    			if (!current || dirty & /*name*/ 64) {
    				attr(select, "name", /*name*/ ctx[6]);
    			}

    			if (!current || dirty & /*size*/ 2 && select_class_value !== (select_class_value = /*size*/ ctx[1] && `bx--select-input--${/*size*/ ctx[1]}`)) {
    				attr(select, "class", select_class_value);
    			}

    			if (dirty & /*size*/ 2) {
    				toggle_class(select, "bx--select-input", true);
    			}

    			if (/*invalid*/ ctx[7]) {
    				if (if_block0) {
    					if (dirty & /*invalid*/ 128) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_9();
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*invalid*/ 128 && div0_data_invalid_value !== (div0_data_invalid_value = /*invalid*/ ctx[7] || undefined)) {
    				attr(div0, "data-invalid", div0_data_invalid_value);
    			}

    			if (/*invalid*/ ctx[7]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_8(ctx);
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*helperText*/ ctx[11]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_7(ctx);
    					if_block2.c();
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(chevrondown16.$$.fragment, local);
    			transition_in(if_block0);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(chevrondown16.$$.fragment, local);
    			transition_out(if_block0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (default_slot) default_slot.d(detaching);
    			/*select_binding*/ ctx[23](null);
    			destroy_component(chevrondown16);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching) detach(t3);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(if_block2_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (125:10) {#if invalid}
    function create_if_block_9(ctx) {
    	let warningfilled16;
    	let current;

    	warningfilled16 = new WarningFilled16({
    			props: { class: "bx--select__invalid-icon" }
    		});

    	return {
    		c() {
    			create_component(warningfilled16.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(warningfilled16, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(warningfilled16.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(warningfilled16.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(warningfilled16, detaching);
    		}
    	};
    }

    // (129:8) {#if invalid}
    function create_if_block_8(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*invalidText*/ ctx[8]);
    			attr(div, "id", /*errorId*/ ctx[15]);
    			toggle_class(div, "bx--form-requirement", true);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*invalidText*/ 256) set_data(t, /*invalidText*/ ctx[8]);

    			if (dirty & /*errorId*/ 32768) {
    				attr(div, "id", /*errorId*/ ctx[15]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (135:6) {#if helperText}
    function create_if_block_7(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*helperText*/ ctx[11]);
    			toggle_class(div, "bx--form__helper-text", true);
    			toggle_class(div, "bx--form__helper-text--disabled", /*disabled*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helperText*/ 2048) set_data(t, /*helperText*/ ctx[11]);

    			if (dirty & /*disabled*/ 16) {
    				toggle_class(div, "bx--form__helper-text--disabled", /*disabled*/ ctx[4]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (144:4) {#if !inline}
    function create_if_block$2(ctx) {
    	let div;
    	let select;
    	let select_aria_describedby_value;
    	let select_disabled_value;
    	let select_aria_invalid_value;
    	let select_class_value;
    	let t0;
    	let chevrondown16;
    	let t1;
    	let t2;
    	let div_data_invalid_value;
    	let t3;
    	let t4;
    	let t5;
    	let if_block4_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[20].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[19], null);
    	chevrondown16 = new ChevronDown16({ props: { class: "bx--select__arrow" } });
    	let if_block0 = /*invalid*/ ctx[7] && create_if_block_5();
    	let if_block1 = !/*invalid*/ ctx[7] && /*warn*/ ctx[9] && create_if_block_4();
    	let if_block2 = !/*invalid*/ ctx[7] && /*helperText*/ ctx[11] && create_if_block_3$1(ctx);
    	let if_block3 = /*invalid*/ ctx[7] && create_if_block_2$1(ctx);
    	let if_block4 = !/*invalid*/ ctx[7] && /*warn*/ ctx[9] && create_if_block_1$2(ctx);

    	return {
    		c() {
    			div = element("div");
    			select = element("select");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			create_component(chevrondown16.$$.fragment);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			if (if_block2) if_block2.c();
    			t4 = space();
    			if (if_block3) if_block3.c();
    			t5 = space();
    			if (if_block4) if_block4.c();
    			if_block4_anchor = empty();
    			attr(select, "id", /*id*/ ctx[5]);
    			attr(select, "name", /*name*/ ctx[6]);
    			attr(select, "aria-describedby", select_aria_describedby_value = /*invalid*/ ctx[7] ? /*errorId*/ ctx[15] : undefined);
    			select.disabled = select_disabled_value = /*disabled*/ ctx[4] || undefined;
    			attr(select, "aria-invalid", select_aria_invalid_value = /*invalid*/ ctx[7] || undefined);
    			attr(select, "class", select_class_value = /*size*/ ctx[1] && `bx--select-input--${/*size*/ ctx[1]}`);
    			toggle_class(select, "bx--select-input", true);
    			attr(div, "data-invalid", div_data_invalid_value = /*invalid*/ ctx[7] || undefined);
    			toggle_class(div, "bx--select-input__wrapper", true);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, select);

    			if (default_slot) {
    				default_slot.m(select, null);
    			}

    			/*select_binding_1*/ ctx[25](select);
    			append(div, t0);
    			mount_component(chevrondown16, div, null);
    			append(div, t1);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t2);
    			if (if_block1) if_block1.m(div, null);
    			insert(target, t3, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, t4, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert(target, t5, anchor);
    			if (if_block4) if_block4.m(target, anchor);
    			insert(target, if_block4_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(select, "change", /*change_handler_1*/ ctx[26]),
    					listen(select, "blur", /*blur_handler_1*/ ctx[21])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 524288)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[19], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*id*/ 32) {
    				attr(select, "id", /*id*/ ctx[5]);
    			}

    			if (!current || dirty & /*name*/ 64) {
    				attr(select, "name", /*name*/ ctx[6]);
    			}

    			if (!current || dirty & /*invalid, errorId*/ 32896 && select_aria_describedby_value !== (select_aria_describedby_value = /*invalid*/ ctx[7] ? /*errorId*/ ctx[15] : undefined)) {
    				attr(select, "aria-describedby", select_aria_describedby_value);
    			}

    			if (!current || dirty & /*disabled*/ 16 && select_disabled_value !== (select_disabled_value = /*disabled*/ ctx[4] || undefined)) {
    				select.disabled = select_disabled_value;
    			}

    			if (!current || dirty & /*invalid*/ 128 && select_aria_invalid_value !== (select_aria_invalid_value = /*invalid*/ ctx[7] || undefined)) {
    				attr(select, "aria-invalid", select_aria_invalid_value);
    			}

    			if (!current || dirty & /*size*/ 2 && select_class_value !== (select_class_value = /*size*/ ctx[1] && `bx--select-input--${/*size*/ ctx[1]}`)) {
    				attr(select, "class", select_class_value);
    			}

    			if (dirty & /*size*/ 2) {
    				toggle_class(select, "bx--select-input", true);
    			}

    			if (/*invalid*/ ctx[7]) {
    				if (if_block0) {
    					if (dirty & /*invalid*/ 128) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_5();
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div, t2);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (!/*invalid*/ ctx[7] && /*warn*/ ctx[9]) {
    				if (if_block1) {
    					if (dirty & /*invalid, warn*/ 640) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_4();
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*invalid*/ 128 && div_data_invalid_value !== (div_data_invalid_value = /*invalid*/ ctx[7] || undefined)) {
    				attr(div, "data-invalid", div_data_invalid_value);
    			}

    			if (!/*invalid*/ ctx[7] && /*helperText*/ ctx[11]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_3$1(ctx);
    					if_block2.c();
    					if_block2.m(t4.parentNode, t4);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*invalid*/ ctx[7]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_2$1(ctx);
    					if_block3.c();
    					if_block3.m(t5.parentNode, t5);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (!/*invalid*/ ctx[7] && /*warn*/ ctx[9]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_1$2(ctx);
    					if_block4.c();
    					if_block4.m(if_block4_anchor.parentNode, if_block4_anchor);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(chevrondown16.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(chevrondown16.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    			/*select_binding_1*/ ctx[25](null);
    			destroy_component(chevrondown16);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching) detach(t3);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(t4);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach(t5);
    			if (if_block4) if_block4.d(detaching);
    			if (detaching) detach(if_block4_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (166:8) {#if invalid}
    function create_if_block_5(ctx) {
    	let warningfilled16;
    	let current;

    	warningfilled16 = new WarningFilled16({
    			props: { class: "bx--select__invalid-icon" }
    		});

    	return {
    		c() {
    			create_component(warningfilled16.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(warningfilled16, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(warningfilled16.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(warningfilled16.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(warningfilled16, detaching);
    		}
    	};
    }

    // (169:8) {#if !invalid && warn}
    function create_if_block_4(ctx) {
    	let warningaltfilled16;
    	let current;

    	warningaltfilled16 = new WarningAltFilled16({
    			props: {
    				class: "bx--select__invalid-icon bx--select__invalid-icon--warning"
    			}
    		});

    	return {
    		c() {
    			create_component(warningaltfilled16.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(warningaltfilled16, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(warningaltfilled16.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(warningaltfilled16.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(warningaltfilled16, detaching);
    		}
    	};
    }

    // (175:6) {#if !invalid && helperText}
    function create_if_block_3$1(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*helperText*/ ctx[11]);
    			toggle_class(div, "bx--form__helper-text", true);
    			toggle_class(div, "bx--form__helper-text--disabled", /*disabled*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*helperText*/ 2048) set_data(t, /*helperText*/ ctx[11]);

    			if (dirty & /*disabled*/ 16) {
    				toggle_class(div, "bx--form__helper-text--disabled", /*disabled*/ ctx[4]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (183:6) {#if invalid}
    function create_if_block_2$1(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*invalidText*/ ctx[8]);
    			attr(div, "id", /*errorId*/ ctx[15]);
    			toggle_class(div, "bx--form-requirement", true);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*invalidText*/ 256) set_data(t, /*invalidText*/ ctx[8]);

    			if (dirty & /*errorId*/ 32768) {
    				attr(div, "id", /*errorId*/ ctx[15]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (188:6) {#if !invalid && warn}
    function create_if_block_1$2(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*warnText*/ ctx[10]);
    			attr(div, "id", /*errorId*/ ctx[15]);
    			toggle_class(div, "bx--form-requirement", true);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*warnText*/ 1024) set_data(t, /*warnText*/ ctx[10]);

    			if (dirty & /*errorId*/ 32768) {
    				attr(div, "id", /*errorId*/ ctx[15]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let current;
    	let if_block0 = !/*noLabel*/ ctx[12] && create_if_block_10(ctx);
    	let if_block1 = /*inline*/ ctx[2] && create_if_block_6(ctx);
    	let if_block2 = !/*inline*/ ctx[2] && create_if_block$2(ctx);
    	let div1_levels = [/*$$restProps*/ ctx[17]];
    	let div1_data = {};

    	for (let i = 0; i < div1_levels.length; i += 1) {
    		div1_data = assign(div1_data, div1_levels[i]);
    	}

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			toggle_class(div0, "bx--select", true);
    			toggle_class(div0, "bx--select--inline", /*inline*/ ctx[2]);
    			toggle_class(div0, "bx--select--light", /*light*/ ctx[3]);
    			toggle_class(div0, "bx--select--invalid", /*invalid*/ ctx[7]);
    			toggle_class(div0, "bx--select--disabled", /*disabled*/ ctx[4]);
    			toggle_class(div0, "bx--select--warning", /*warn*/ ctx[9]);
    			set_attributes(div1, div1_data);
    			toggle_class(div1, "bx--form-item", true);
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			if (if_block0) if_block0.m(div0, null);
    			append(div0, t0);
    			if (if_block1) if_block1.m(div0, null);
    			append(div0, t1);
    			if (if_block2) if_block2.m(div0, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!/*noLabel*/ ctx[12]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_10(ctx);
    					if_block0.c();
    					if_block0.m(div0, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*inline*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*inline*/ 4) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_6(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div0, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!/*inline*/ ctx[2]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*inline*/ 4) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block$2(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div0, null);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*inline*/ 4) {
    				toggle_class(div0, "bx--select--inline", /*inline*/ ctx[2]);
    			}

    			if (dirty & /*light*/ 8) {
    				toggle_class(div0, "bx--select--light", /*light*/ ctx[3]);
    			}

    			if (dirty & /*invalid*/ 128) {
    				toggle_class(div0, "bx--select--invalid", /*invalid*/ ctx[7]);
    			}

    			if (dirty & /*disabled*/ 16) {
    				toggle_class(div0, "bx--select--disabled", /*disabled*/ ctx[4]);
    			}

    			if (dirty & /*warn*/ 512) {
    				toggle_class(div0, "bx--select--warning", /*warn*/ ctx[9]);
    			}

    			set_attributes(div1, div1_data = get_spread_update(div1_levels, [dirty & /*$$restProps*/ 131072 && /*$$restProps*/ ctx[17]]));
    			toggle_class(div1, "bx--form-item", true);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let errorId;

    	const omit_props_names = [
    		"selected","size","inline","light","disabled","id","name","invalid","invalidText","warn","warnText","helperText","noLabel","labelText","hideLabel","ref"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let $selectedValue;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { selected = undefined } = $$props;
    	let { size = undefined } = $$props;
    	let { inline = false } = $$props;
    	let { light = false } = $$props;
    	let { disabled = false } = $$props;
    	let { id = "ccs-" + Math.random().toString(36) } = $$props;
    	let { name = undefined } = $$props;
    	let { invalid = false } = $$props;
    	let { invalidText = "" } = $$props;
    	let { warn = false } = $$props;
    	let { warnText = "" } = $$props;
    	let { helperText = "" } = $$props;
    	let { noLabel = false } = $$props;
    	let { labelText = "" } = $$props;
    	let { hideLabel = false } = $$props;
    	let { ref = null } = $$props;
    	const dispatch = createEventDispatcher();
    	const selectedValue = writable(selected);
    	component_subscribe($$self, selectedValue, value => $$invalidate(27, $selectedValue = value));
    	setContext("Select", { selectedValue });

    	afterUpdate(() => {
    		$$invalidate(18, selected = $selectedValue);
    		dispatch("change", $selectedValue);
    	});

    	function blur_handler_1(event) {
    		bubble($$self, event);
    	}

    	function blur_handler(event) {
    		bubble($$self, event);
    	}

    	function select_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			ref = $$value;
    			$$invalidate(0, ref);
    		});
    	}

    	const change_handler = ({ target }) => {
    		selectedValue.set(target.value);
    	};

    	function select_binding_1($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			ref = $$value;
    			$$invalidate(0, ref);
    		});
    	}

    	const change_handler_1 = ({ target }) => {
    		selectedValue.set(target.value);
    	};

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(17, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("selected" in $$new_props) $$invalidate(18, selected = $$new_props.selected);
    		if ("size" in $$new_props) $$invalidate(1, size = $$new_props.size);
    		if ("inline" in $$new_props) $$invalidate(2, inline = $$new_props.inline);
    		if ("light" in $$new_props) $$invalidate(3, light = $$new_props.light);
    		if ("disabled" in $$new_props) $$invalidate(4, disabled = $$new_props.disabled);
    		if ("id" in $$new_props) $$invalidate(5, id = $$new_props.id);
    		if ("name" in $$new_props) $$invalidate(6, name = $$new_props.name);
    		if ("invalid" in $$new_props) $$invalidate(7, invalid = $$new_props.invalid);
    		if ("invalidText" in $$new_props) $$invalidate(8, invalidText = $$new_props.invalidText);
    		if ("warn" in $$new_props) $$invalidate(9, warn = $$new_props.warn);
    		if ("warnText" in $$new_props) $$invalidate(10, warnText = $$new_props.warnText);
    		if ("helperText" in $$new_props) $$invalidate(11, helperText = $$new_props.helperText);
    		if ("noLabel" in $$new_props) $$invalidate(12, noLabel = $$new_props.noLabel);
    		if ("labelText" in $$new_props) $$invalidate(13, labelText = $$new_props.labelText);
    		if ("hideLabel" in $$new_props) $$invalidate(14, hideLabel = $$new_props.hideLabel);
    		if ("ref" in $$new_props) $$invalidate(0, ref = $$new_props.ref);
    		if ("$$scope" in $$new_props) $$invalidate(19, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*id*/ 32) {
    			$$invalidate(15, errorId = `error-${id}`);
    		}

    		if ($$self.$$.dirty & /*selected*/ 262144) {
    			selectedValue.set(selected);
    		}
    	};

    	return [
    		ref,
    		size,
    		inline,
    		light,
    		disabled,
    		id,
    		name,
    		invalid,
    		invalidText,
    		warn,
    		warnText,
    		helperText,
    		noLabel,
    		labelText,
    		hideLabel,
    		errorId,
    		selectedValue,
    		$$restProps,
    		selected,
    		$$scope,
    		slots,
    		blur_handler_1,
    		blur_handler,
    		select_binding,
    		change_handler,
    		select_binding_1,
    		change_handler_1
    	];
    }

    class Select extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {
    			selected: 18,
    			size: 1,
    			inline: 2,
    			light: 3,
    			disabled: 4,
    			id: 5,
    			name: 6,
    			invalid: 7,
    			invalidText: 8,
    			warn: 9,
    			warnText: 10,
    			helperText: 11,
    			noLabel: 12,
    			labelText: 13,
    			hideLabel: 14,
    			ref: 0
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/Select/SelectItem.svelte generated by Svelte v3.38.2 */

    function create_fragment$8(ctx) {
    	let option;
    	let t_value = (/*text*/ ctx[1] || /*value*/ ctx[0]) + "";
    	let t;
    	let option_class_value;
    	let option_style_value;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*value*/ ctx[0];
    			option.value = option.__value;
    			option.disabled = /*disabled*/ ctx[3];
    			option.hidden = /*hidden*/ ctx[2];
    			option.selected = /*selected*/ ctx[4];
    			attr(option, "class", option_class_value = /*$$restProps*/ ctx[5].class);
    			attr(option, "style", option_style_value = /*$$restProps*/ ctx[5].style);
    			toggle_class(option, "bx--select-option", true);
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*text, value*/ 3 && t_value !== (t_value = (/*text*/ ctx[1] || /*value*/ ctx[0]) + "")) set_data(t, t_value);

    			if (dirty & /*value*/ 1) {
    				option.__value = /*value*/ ctx[0];
    				option.value = option.__value;
    			}

    			if (dirty & /*disabled*/ 8) {
    				option.disabled = /*disabled*/ ctx[3];
    			}

    			if (dirty & /*hidden*/ 4) {
    				option.hidden = /*hidden*/ ctx[2];
    			}

    			if (dirty & /*selected*/ 16) {
    				option.selected = /*selected*/ ctx[4];
    			}

    			if (dirty & /*$$restProps*/ 32 && option_class_value !== (option_class_value = /*$$restProps*/ ctx[5].class)) {
    				attr(option, "class", option_class_value);
    			}

    			if (dirty & /*$$restProps*/ 32 && option_style_value !== (option_style_value = /*$$restProps*/ ctx[5].style)) {
    				attr(option, "style", option_style_value);
    			}

    			if (dirty & /*$$restProps*/ 32) {
    				toggle_class(option, "bx--select-option", true);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	const omit_props_names = ["value","text","hidden","disabled"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { value = "" } = $$props;
    	let { text = "" } = $$props;
    	let { hidden = false } = $$props;
    	let { disabled = false } = $$props;
    	const ctx = getContext("Select") || getContext("TimePickerSelect");
    	let selected = false;

    	const unsubscribe = ctx.selectedValue.subscribe(currentValue => {
    		$$invalidate(4, selected = currentValue === value);
    	});

    	onDestroy(() => {
    		unsubscribe();
    	});

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(5, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("value" in $$new_props) $$invalidate(0, value = $$new_props.value);
    		if ("text" in $$new_props) $$invalidate(1, text = $$new_props.text);
    		if ("hidden" in $$new_props) $$invalidate(2, hidden = $$new_props.hidden);
    		if ("disabled" in $$new_props) $$invalidate(3, disabled = $$new_props.disabled);
    	};

    	return [value, text, hidden, disabled, selected, $$restProps];
    }

    class SelectItem extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			value: 0,
    			text: 1,
    			hidden: 2,
    			disabled: 3
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/Pagination/Pagination.svelte generated by Svelte v3.38.2 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	child_ctx[28] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	child_ctx[28] = i;
    	return child_ctx;
    }

    // (101:4) {#if !pageSizeInputDisabled}
    function create_if_block_3(ctx) {
    	let label;
    	let t0;
    	let label_id_value;
    	let label_for_value;
    	let t1;
    	let select;
    	let updating_selected;
    	let current;

    	function select_selected_binding(value) {
    		/*select_selected_binding*/ ctx[22](value);
    	}

    	let select_props = {
    		id: "bx--pagination-select-" + /*id*/ ctx[14],
    		class: "bx--select__item-count",
    		hideLabel: true,
    		noLabel: true,
    		inline: true,
    		$$slots: { default: [create_default_slot_1$2] },
    		$$scope: { ctx }
    	};

    	if (/*pageSize*/ ctx[1] !== void 0) {
    		select_props.selected = /*pageSize*/ ctx[1];
    	}

    	select = new Select({ props: select_props });
    	binding_callbacks.push(() => bind(select, "selected", select_selected_binding));

    	return {
    		c() {
    			label = element("label");
    			t0 = text(/*itemsPerPageText*/ ctx[5]);
    			t1 = space();
    			create_component(select.$$.fragment);
    			attr(label, "id", label_id_value = "bx--pagination-select-" + /*id*/ ctx[14] + "-count-label");
    			attr(label, "for", label_for_value = "bx--pagination-select-" + /*id*/ ctx[14]);
    			toggle_class(label, "bx--pagination__text", true);
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, t0);
    			insert(target, t1, anchor);
    			mount_component(select, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (!current || dirty & /*itemsPerPageText*/ 32) set_data(t0, /*itemsPerPageText*/ ctx[5]);

    			if (!current || dirty & /*id*/ 16384 && label_id_value !== (label_id_value = "bx--pagination-select-" + /*id*/ ctx[14] + "-count-label")) {
    				attr(label, "id", label_id_value);
    			}

    			if (!current || dirty & /*id*/ 16384 && label_for_value !== (label_for_value = "bx--pagination-select-" + /*id*/ ctx[14])) {
    				attr(label, "for", label_for_value);
    			}

    			const select_changes = {};
    			if (dirty & /*id*/ 16384) select_changes.id = "bx--pagination-select-" + /*id*/ ctx[14];

    			if (dirty & /*$$scope, pageSizes*/ 1073742848) {
    				select_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_selected && dirty & /*pageSize*/ 2) {
    				updating_selected = true;
    				select_changes.selected = /*pageSize*/ ctx[1];
    				add_flush_callback(() => updating_selected = false);
    			}

    			select.$set(select_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(select.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(select.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(label);
    			if (detaching) detach(t1);
    			destroy_component(select, detaching);
    		}
    	};
    }

    // (117:8) {#each pageSizes as size, i (size)}
    function create_each_block_1(key_1, ctx) {
    	let first;
    	let selectitem;
    	let current;

    	selectitem = new SelectItem({
    			props: {
    				value: /*size*/ ctx[26],
    				text: /*size*/ ctx[26].toString()
    			}
    		});

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			create_component(selectitem.$$.fragment);
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(selectitem, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const selectitem_changes = {};
    			if (dirty & /*pageSizes*/ 1024) selectitem_changes.value = /*size*/ ctx[26];
    			if (dirty & /*pageSizes*/ 1024) selectitem_changes.text = /*size*/ ctx[26].toString();
    			selectitem.$set(selectitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(selectitem.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(selectitem.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			destroy_component(selectitem, detaching);
    		}
    	};
    }

    // (109:6) <Select         id="bx--pagination-select-{id}"         class="bx--select__item-count"         hideLabel         noLabel         inline         bind:selected="{pageSize}"       >
    function create_default_slot_1$2(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*pageSizes*/ ctx[10];
    	const get_key = ctx => /*size*/ ctx[26];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*pageSizes*/ 1024) {
    				each_value_1 = /*pageSizes*/ ctx[10];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block_1, each_1_anchor, get_each_context_1);
    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (125:6) {:else}
    function create_else_block_1(ctx) {
    	let t_value = /*itemRangeText*/ ctx[7](Math.min(/*pageSize*/ ctx[1] * (/*page*/ ctx[0] - 1) + 1, /*totalItems*/ ctx[2]), Math.min(/*page*/ ctx[0] * /*pageSize*/ ctx[1], /*totalItems*/ ctx[2]), /*totalItems*/ ctx[2]) + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*itemRangeText, pageSize, page, totalItems*/ 135 && t_value !== (t_value = /*itemRangeText*/ ctx[7](Math.min(/*pageSize*/ ctx[1] * (/*page*/ ctx[0] - 1) + 1, /*totalItems*/ ctx[2]), Math.min(/*page*/ ctx[0] * /*pageSize*/ ctx[1], /*totalItems*/ ctx[2]), /*totalItems*/ ctx[2]) + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (123:6) {#if pagesUnknown}
    function create_if_block_2(ctx) {
    	let t_value = /*itemText*/ ctx[6](/*pageSize*/ ctx[1] * (/*page*/ ctx[0] - 1) + 1, /*page*/ ctx[0] * /*pageSize*/ ctx[1]) + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*itemText, pageSize, page*/ 67 && t_value !== (t_value = /*itemText*/ ctx[6](/*pageSize*/ ctx[1] * (/*page*/ ctx[0] - 1) + 1, /*page*/ ctx[0] * /*pageSize*/ ctx[1]) + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (135:4) {#if !pageInputDisabled}
    function create_if_block$1(ctx) {
    	let select;
    	let updating_selected;
    	let t;
    	let span;
    	let current;

    	function select_selected_binding_1(value) {
    		/*select_selected_binding_1*/ ctx[23](value);
    	}

    	let select_props = {
    		id: "bx--pagination-select-" + (/*id*/ ctx[14] + 2),
    		class: "bx--select__page-number",
    		labelText: "Page number, of " + /*totalPages*/ ctx[15] + " pages",
    		inline: true,
    		hideLabel: true,
    		$$slots: { default: [create_default_slot$4] },
    		$$scope: { ctx }
    	};

    	if (/*page*/ ctx[0] !== void 0) {
    		select_props.selected = /*page*/ ctx[0];
    	}

    	select = new Select({ props: select_props });
    	binding_callbacks.push(() => bind(select, "selected", select_selected_binding_1));

    	function select_block_type_1(ctx, dirty) {
    		if (/*pagesUnknown*/ ctx[11]) return create_if_block_1$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			create_component(select.$$.fragment);
    			t = space();
    			span = element("span");
    			if_block.c();
    			toggle_class(span, "bx--pagination__text", true);
    		},
    		m(target, anchor) {
    			mount_component(select, target, anchor);
    			insert(target, t, anchor);
    			insert(target, span, anchor);
    			if_block.m(span, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const select_changes = {};
    			if (dirty & /*id*/ 16384) select_changes.id = "bx--pagination-select-" + (/*id*/ ctx[14] + 2);
    			if (dirty & /*totalPages*/ 32768) select_changes.labelText = "Page number, of " + /*totalPages*/ ctx[15] + " pages";

    			if (dirty & /*$$scope, selectItems*/ 1073807360) {
    				select_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_selected && dirty & /*page*/ 1) {
    				updating_selected = true;
    				select_changes.selected = /*page*/ ctx[0];
    				add_flush_callback(() => updating_selected = false);
    			}

    			select.$set(select_changes);

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(select.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(select.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(select, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(span);
    			if_block.d();
    		}
    	};
    }

    // (144:8) {#each selectItems as size, i (size)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let selectitem;
    	let current;

    	selectitem = new SelectItem({
    			props: {
    				value: /*size*/ ctx[26] + 1,
    				text: (/*size*/ ctx[26] + 1).toString()
    			}
    		});

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			create_component(selectitem.$$.fragment);
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(selectitem, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const selectitem_changes = {};
    			if (dirty & /*selectItems*/ 65536) selectitem_changes.value = /*size*/ ctx[26] + 1;
    			if (dirty & /*selectItems*/ 65536) selectitem_changes.text = (/*size*/ ctx[26] + 1).toString();
    			selectitem.$set(selectitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(selectitem.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(selectitem.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			destroy_component(selectitem, detaching);
    		}
    	};
    }

    // (136:6) <Select         id="bx--pagination-select-{id + 2}"         class="bx--select__page-number"         labelText="Page number, of {totalPages} pages"         inline         hideLabel         bind:selected="{page}"       >
    function create_default_slot$4(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let current;
    	let each_value = /*selectItems*/ ctx[16];
    	const get_key = ctx => /*size*/ ctx[26];

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*selectItems*/ 65536) {
    				each_value = /*selectItems*/ ctx[16];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block, each_1_anchor, get_each_context);
    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (151:8) {:else}
    function create_else_block(ctx) {
    	let t_value = /*pageRangeText*/ ctx[13](/*page*/ ctx[0], /*totalPages*/ ctx[15]) + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*pageRangeText, page, totalPages*/ 40961 && t_value !== (t_value = /*pageRangeText*/ ctx[13](/*page*/ ctx[0], /*totalPages*/ ctx[15]) + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (149:8) {#if pagesUnknown}
    function create_if_block_1$1(ctx) {
    	let t_value = /*pageText*/ ctx[12](/*page*/ ctx[0]) + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*pageText, page*/ 4097 && t_value !== (t_value = /*pageText*/ ctx[12](/*page*/ ctx[0]) + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$7(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let span;
    	let t1;
    	let div1;
    	let t2;
    	let button0;
    	let t3;
    	let button1;
    	let current;
    	let if_block0 = !/*pageSizeInputDisabled*/ ctx[9] && create_if_block_3(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*pagesUnknown*/ ctx[11]) return create_if_block_2;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type(ctx);
    	let if_block2 = !/*pageInputDisabled*/ ctx[8] && create_if_block$1(ctx);

    	button0 = new Button({
    			props: {
    				hasIconOnly: true,
    				kind: "ghost",
    				tooltipAlignment: "center",
    				tooltipPosition: "top",
    				icon: CaretLeft16,
    				iconDescription: /*backwardText*/ ctx[4],
    				disabled: /*backButtonDisabled*/ ctx[17],
    				class: "bx--pagination__button bx--pagination__button--backward " + (/*backButtonDisabled*/ ctx[17]
    				? "bx--pagination__button--no-index"
    				: "")
    			}
    		});

    	button0.$on("click", /*click_handler*/ ctx[24]);

    	button1 = new Button({
    			props: {
    				hasIconOnly: true,
    				kind: "ghost",
    				tooltipAlignment: "end",
    				tooltipPosition: "top",
    				icon: CaretRight16,
    				iconDescription: /*forwardText*/ ctx[3],
    				disabled: /*forwardButtonDisabled*/ ctx[18],
    				class: "bx--pagination__button bx--pagination__button--forward " + (/*forwardButtonDisabled*/ ctx[18]
    				? "bx--pagination__button--no-index"
    				: "")
    			}
    		});

    	button1.$on("click", /*click_handler_1*/ ctx[25]);
    	let div2_levels = [{ id: /*id*/ ctx[14] }, /*$$restProps*/ ctx[20]];
    	let div2_data = {};

    	for (let i = 0; i < div2_levels.length; i += 1) {
    		div2_data = assign(div2_data, div2_levels[i]);
    	}

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			span = element("span");
    			if_block1.c();
    			t1 = space();
    			div1 = element("div");
    			if (if_block2) if_block2.c();
    			t2 = space();
    			create_component(button0.$$.fragment);
    			t3 = space();
    			create_component(button1.$$.fragment);
    			toggle_class(span, "bx--pagination__text", !/*pageSizeInputDisabled*/ ctx[9]);
    			toggle_class(div0, "bx--pagination__left", true);
    			toggle_class(div1, "bx--pagination__right", true);
    			set_attributes(div2, div2_data);
    			toggle_class(div2, "bx--pagination", true);
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			if (if_block0) if_block0.m(div0, null);
    			append(div0, t0);
    			append(div0, span);
    			if_block1.m(span, null);
    			append(div2, t1);
    			append(div2, div1);
    			if (if_block2) if_block2.m(div1, null);
    			append(div1, t2);
    			mount_component(button0, div1, null);
    			append(div1, t3);
    			mount_component(button1, div1, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!/*pageSizeInputDisabled*/ ctx[9]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*pageSizeInputDisabled*/ 512) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div0, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(span, null);
    				}
    			}

    			if (dirty & /*pageSizeInputDisabled*/ 512) {
    				toggle_class(span, "bx--pagination__text", !/*pageSizeInputDisabled*/ ctx[9]);
    			}

    			if (!/*pageInputDisabled*/ ctx[8]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*pageInputDisabled*/ 256) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block$1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div1, t2);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			const button0_changes = {};
    			if (dirty & /*backwardText*/ 16) button0_changes.iconDescription = /*backwardText*/ ctx[4];
    			if (dirty & /*backButtonDisabled*/ 131072) button0_changes.disabled = /*backButtonDisabled*/ ctx[17];

    			if (dirty & /*backButtonDisabled*/ 131072) button0_changes.class = "bx--pagination__button bx--pagination__button--backward " + (/*backButtonDisabled*/ ctx[17]
    			? "bx--pagination__button--no-index"
    			: "");

    			button0.$set(button0_changes);
    			const button1_changes = {};
    			if (dirty & /*forwardText*/ 8) button1_changes.iconDescription = /*forwardText*/ ctx[3];
    			if (dirty & /*forwardButtonDisabled*/ 262144) button1_changes.disabled = /*forwardButtonDisabled*/ ctx[18];

    			if (dirty & /*forwardButtonDisabled*/ 262144) button1_changes.class = "bx--pagination__button bx--pagination__button--forward " + (/*forwardButtonDisabled*/ ctx[18]
    			? "bx--pagination__button--no-index"
    			: "");

    			button1.$set(button1_changes);

    			set_attributes(div2, div2_data = get_spread_update(div2_levels, [
    				(!current || dirty & /*id*/ 16384) && { id: /*id*/ ctx[14] },
    				dirty & /*$$restProps*/ 1048576 && /*$$restProps*/ ctx[20]
    			]));

    			toggle_class(div2, "bx--pagination", true);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block2);
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block2);
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    			if (if_block2) if_block2.d();
    			destroy_component(button0);
    			destroy_component(button1);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let totalPages;
    	let selectItems;
    	let backButtonDisabled;
    	let forwardButtonDisabled;

    	const omit_props_names = [
    		"page","totalItems","disabled","forwardText","backwardText","itemsPerPageText","itemText","itemRangeText","pageInputDisabled","pageSizeInputDisabled","pageSize","pageSizes","pagesUnknown","pageText","pageRangeText","id"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { page = 1 } = $$props;
    	let { totalItems = 0 } = $$props;
    	let { disabled = false } = $$props;
    	let { forwardText = "Next page" } = $$props;
    	let { backwardText = "Previous page" } = $$props;
    	let { itemsPerPageText = "Items per page:" } = $$props;
    	let { itemText = (min, max) => `${min}–${max} items` } = $$props;
    	let { itemRangeText = (min, max, total) => `${min}–${max} of ${total} items` } = $$props;
    	let { pageInputDisabled = false } = $$props;
    	let { pageSizeInputDisabled = false } = $$props;
    	let { pageSize = 10 } = $$props;
    	let { pageSizes = [10] } = $$props;
    	let { pagesUnknown = false } = $$props;
    	let { pageText = page => `page ${page}` } = $$props;
    	let { pageRangeText = (current, total) => `of ${total} page${total === 1 ? "" : "s"}` } = $$props;
    	let { id = "ccs-" + Math.random().toString(36) } = $$props;
    	const dispatch = createEventDispatcher();

    	function select_selected_binding(value) {
    		pageSize = value;
    		($$invalidate(1, pageSize), $$invalidate(0, page));
    	}

    	function select_selected_binding_1(value) {
    		page = value;
    		($$invalidate(0, page), $$invalidate(1, pageSize));
    	}

    	const click_handler = () => {
    		$$invalidate(0, page--, page);
    		dispatch("click:button--previous", { page });
    	};

    	const click_handler_1 = () => {
    		$$invalidate(0, page++, page);
    		dispatch("click:button--next", { page });
    	};

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(20, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("page" in $$new_props) $$invalidate(0, page = $$new_props.page);
    		if ("totalItems" in $$new_props) $$invalidate(2, totalItems = $$new_props.totalItems);
    		if ("disabled" in $$new_props) $$invalidate(21, disabled = $$new_props.disabled);
    		if ("forwardText" in $$new_props) $$invalidate(3, forwardText = $$new_props.forwardText);
    		if ("backwardText" in $$new_props) $$invalidate(4, backwardText = $$new_props.backwardText);
    		if ("itemsPerPageText" in $$new_props) $$invalidate(5, itemsPerPageText = $$new_props.itemsPerPageText);
    		if ("itemText" in $$new_props) $$invalidate(6, itemText = $$new_props.itemText);
    		if ("itemRangeText" in $$new_props) $$invalidate(7, itemRangeText = $$new_props.itemRangeText);
    		if ("pageInputDisabled" in $$new_props) $$invalidate(8, pageInputDisabled = $$new_props.pageInputDisabled);
    		if ("pageSizeInputDisabled" in $$new_props) $$invalidate(9, pageSizeInputDisabled = $$new_props.pageSizeInputDisabled);
    		if ("pageSize" in $$new_props) $$invalidate(1, pageSize = $$new_props.pageSize);
    		if ("pageSizes" in $$new_props) $$invalidate(10, pageSizes = $$new_props.pageSizes);
    		if ("pagesUnknown" in $$new_props) $$invalidate(11, pagesUnknown = $$new_props.pagesUnknown);
    		if ("pageText" in $$new_props) $$invalidate(12, pageText = $$new_props.pageText);
    		if ("pageRangeText" in $$new_props) $$invalidate(13, pageRangeText = $$new_props.pageRangeText);
    		if ("id" in $$new_props) $$invalidate(14, id = $$new_props.id);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*page, pageSize*/ 3) {
    			{
    				if (typeof page !== "number") {
    					$$invalidate(0, page = Number(page));
    				}

    				if (typeof pageSize !== "number") {
    					$$invalidate(1, pageSize = Number(pageSize));
    				}

    				dispatch("update", { pageSize, page });
    			}
    		}

    		if ($$self.$$.dirty & /*totalItems, pageSize*/ 6) {
    			$$invalidate(15, totalPages = Math.max(Math.ceil(totalItems / pageSize), 1));
    		}

    		if ($$self.$$.dirty & /*totalPages*/ 32768) {
    			$$invalidate(16, selectItems = Array.from({ length: totalPages }, (_, i) => i));
    		}

    		if ($$self.$$.dirty & /*disabled, page*/ 2097153) {
    			$$invalidate(17, backButtonDisabled = disabled || page === 1);
    		}

    		if ($$self.$$.dirty & /*disabled, page, totalPages*/ 2129921) {
    			$$invalidate(18, forwardButtonDisabled = disabled || page === totalPages);
    		}
    	};

    	return [
    		page,
    		pageSize,
    		totalItems,
    		forwardText,
    		backwardText,
    		itemsPerPageText,
    		itemText,
    		itemRangeText,
    		pageInputDisabled,
    		pageSizeInputDisabled,
    		pageSizes,
    		pagesUnknown,
    		pageText,
    		pageRangeText,
    		id,
    		totalPages,
    		selectItems,
    		backButtonDisabled,
    		forwardButtonDisabled,
    		dispatch,
    		$$restProps,
    		disabled,
    		select_selected_binding,
    		select_selected_binding_1,
    		click_handler,
    		click_handler_1
    	];
    }

    class Pagination extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			page: 0,
    			totalItems: 2,
    			disabled: 21,
    			forwardText: 3,
    			backwardText: 4,
    			itemsPerPageText: 5,
    			itemText: 6,
    			itemRangeText: 7,
    			pageInputDisabled: 8,
    			pageSizeInputDisabled: 9,
    			pageSize: 1,
    			pageSizes: 10,
    			pagesUnknown: 11,
    			pageText: 12,
    			pageRangeText: 13,
    			id: 14
    		});
    	}
    }

    /* node_modules/carbon-components-svelte/src/UIShell/Content.svelte generated by Svelte v3.38.2 */

    function create_fragment$6(ctx) {
    	let main;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);
    	let main_levels = [{ id: /*id*/ ctx[0] }, /*$$restProps*/ ctx[1]];
    	let main_data = {};

    	for (let i = 0; i < main_levels.length; i += 1) {
    		main_data = assign(main_data, main_levels[i]);
    	}

    	return {
    		c() {
    			main = element("main");
    			if (default_slot) default_slot.c();
    			set_attributes(main, main_data);
    			toggle_class(main, "bx--content", true);
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);

    			if (default_slot) {
    				default_slot.m(main, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			set_attributes(main, main_data = get_spread_update(main_levels, [
    				(!current || dirty & /*id*/ 1) && { id: /*id*/ ctx[0] },
    				dirty & /*$$restProps*/ 2 && /*$$restProps*/ ctx[1]
    			]));

    			toggle_class(main, "bx--content", true);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	const omit_props_names = ["id"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { id = "main-content" } = $$props;

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(1, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("id" in $$new_props) $$invalidate(0, id = $$new_props.id);
    		if ("$$scope" in $$new_props) $$invalidate(2, $$scope = $$new_props.$$scope);
    	};

    	return [id, $$restProps, $$scope, slots];
    }

    class Content extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { id: 0 });
    	}
    }

    /* src/components/Header.svelte generated by Svelte v3.38.2 */

    function create_default_slot$3(ctx) {
    	let selectitem0;
    	let t0;
    	let selectitem1;
    	let t1;
    	let selectitem2;
    	let t2;
    	let selectitem3;
    	let current;
    	selectitem0 = new SelectItem({ props: { value: "white", text: "White" } });
    	selectitem1 = new SelectItem({ props: { value: "g10", text: "Gray 10" } });
    	selectitem2 = new SelectItem({ props: { value: "g90", text: "Gray 90" } });

    	selectitem3 = new SelectItem({
    			props: { value: "g100", text: "Gray 100" }
    		});

    	return {
    		c() {
    			create_component(selectitem0.$$.fragment);
    			t0 = space();
    			create_component(selectitem1.$$.fragment);
    			t1 = space();
    			create_component(selectitem2.$$.fragment);
    			t2 = space();
    			create_component(selectitem3.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(selectitem0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(selectitem1, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(selectitem2, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(selectitem3, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(selectitem0.$$.fragment, local);
    			transition_in(selectitem1.$$.fragment, local);
    			transition_in(selectitem2.$$.fragment, local);
    			transition_in(selectitem3.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(selectitem0.$$.fragment, local);
    			transition_out(selectitem1.$$.fragment, local);
    			transition_out(selectitem2.$$.fragment, local);
    			transition_out(selectitem3.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(selectitem0, detaching);
    			if (detaching) detach(t0);
    			destroy_component(selectitem1, detaching);
    			if (detaching) detach(t1);
    			destroy_component(selectitem2, detaching);
    			if (detaching) detach(t2);
    			destroy_component(selectitem3, detaching);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let div1;
    	let h1;
    	let t1;
    	let div0;
    	let select;
    	let current;

    	select = new Select({
    			props: {
    				selected: theme,
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			}
    		});

    	select.$on("change", /*selectTheme*/ ctx[0]);

    	return {
    		c() {
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Github Public Repos";
    			t1 = space();
    			div0 = element("div");
    			create_component(select.$$.fragment);
    			attr(div1, "id", "theme-selector");
    			attr(div1, "class", "svelte-1rx1fcz");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, h1);
    			append(div1, t1);
    			append(div1, div0);
    			mount_component(select, div0, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const select_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				select_changes.$$scope = { dirty, ctx };
    			}

    			select.$set(select_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(select.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(select.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_component(select);
    		}
    	};
    }

    let theme = "g100";

    function instance$5($$self) {
    	const dispatch = createEventDispatcher();

    	function selectTheme(event) {
    		dispatch("themeSelected", { theme: event.detail });
    	}

    	return [selectTheme];
    }

    class Header extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});
    	}
    }

    /* src/components/Theme.svelte generated by Svelte v3.38.2 */

    function create_fragment$4(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { persist = false } = $$props;
    	let { persistKey = "theme" } = $$props;
    	let { theme = "white" } = $$props;
    	const themes = ["white", "g10", "g90", "g100"];
    	const isValidTheme = value => themes.includes(value);
    	const isDark = value => isValidTheme(value) && (value === "g90" || value === "g100");
    	const dark = writable(isDark(theme));
    	const light = derived(dark, _ => !_);

    	setContext("Theme", {
    		updateVar: (name, value) => {
    			document.documentElement.style.setProperty(name, value);
    		},
    		dark,
    		light
    	});

    	onMount(() => {
    		try {
    			const persisted_theme = localStorage.getItem(persistKey);

    			if (isValidTheme(persisted_theme)) {
    				$$invalidate(0, theme = persisted_theme);
    			}
    		} catch(error) {
    			console.error(error);
    		}
    	});

    	afterUpdate(() => {
    		if (isValidTheme(theme)) {
    			document.documentElement.setAttribute("theme", theme);

    			if (persist) {
    				localStorage.setItem(persistKey, theme);
    			}
    		} else {
    			console.warn(`"${theme}" is not a valid Carbon theme. Choose from available themes: ${JSON.stringify(themes)}`);
    		}
    	});

    	$$self.$$set = $$props => {
    		if ("persist" in $$props) $$invalidate(1, persist = $$props.persist);
    		if ("persistKey" in $$props) $$invalidate(2, persistKey = $$props.persistKey);
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*theme*/ 1) {
    			dark.set(isDark(theme));
    		}
    	};

    	return [theme, persist, persistKey, themes, $$scope, slots];
    }

    class Theme extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			persist: 1,
    			persistKey: 2,
    			theme: 0,
    			themes: 3
    		});
    	}

    	get themes() {
    		return this.$$.ctx[3];
    	}
    }

    async function http(request) {
        const response = await fetch(request);
        try {
            response.parsedBody = await response.json();
        }
        catch (ex) { }
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        return response;
    }
    async function get(path, args = { method: "get" }) {
        return await http(new Request(path, args));
    }

    async function getReadme(fullName) {
        let response = await fetch(`https://raw.githubusercontent.com/${fullName}/master/README`);
        if (!response.ok) {
            response = await fetch(`https://raw.githubusercontent.com/${fullName}/master/README.md`);
        }
        return response.text();
    }

    /* src/components/RepoDetails.svelte generated by Svelte v3.38.2 */

    function create_catch_block_1(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    // (27:36)    <Modal     passiveModal     size="lg"     modalHeading={details.full_name}
    function create_then_block(ctx) {
    	let modal;
    	let updating_open;
    	let current;

    	function modal_open_binding(value) {
    		/*modal_open_binding*/ ctx[3](value);
    	}

    	let modal_props = {
    		passiveModal: true,
    		size: "lg",
    		modalHeading: /*details*/ ctx[8].full_name,
    		$$slots: { default: [create_default_slot$2] },
    		$$scope: { ctx }
    	};

    	if (/*open*/ ctx[0] !== void 0) {
    		modal_props.open = /*open*/ ctx[0];
    	}

    	modal = new Modal({ props: modal_props });
    	binding_callbacks.push(() => bind(modal, "open", modal_open_binding));
    	modal.$on("open", /*open_handler*/ ctx[4]);
    	modal.$on("close", /*close_handler*/ ctx[5]);

    	return {
    		c() {
    			create_component(modal.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const modal_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_open && dirty & /*open*/ 1) {
    				updating_open = true;
    				modal_changes.open = /*open*/ ctx[0];
    				add_flush_callback(() => updating_open = false);
    			}

    			modal.$set(modal_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    }

    // (39:10) <Column style={"padding:0"}>
    function create_default_slot_6(ctx) {
    	let imageloader;
    	let current;

    	imageloader = new ImageLoader({
    			props: {
    				fadeIn: true,
    				src: /*details*/ ctx[8].owner.avatar_url,
    				alt: /*details*/ ctx[8].owner.login,
    				width: "128"
    			}
    		});

    	return {
    		c() {
    			create_component(imageloader.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(imageloader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(imageloader.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(imageloader.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(imageloader, detaching);
    		}
    	};
    }

    // (52:12) <Link href={details.owner.html_url} target="_blank">
    function create_default_slot_5(ctx) {
    	let h4;
    	let t_value = /*details*/ ctx[8].owner.login + "";
    	let t;

    	return {
    		c() {
    			h4 = element("h4");
    			t = text(t_value);
    			attr(h4, "class", "svelte-shxzpm");
    		},
    		m(target, anchor) {
    			insert(target, h4, anchor);
    			append(h4, t);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(h4);
    		}
    	};
    }

    // (59:12) <Link href={details.html_url} target="_blank">
    function create_default_slot_4(ctx) {
    	let h4;
    	let t_value = /*details*/ ctx[8].name + "";
    	let t;

    	return {
    		c() {
    			h4 = element("h4");
    			t = text(t_value);
    			attr(h4, "class", "svelte-shxzpm");
    		},
    		m(target, anchor) {
    			insert(target, h4, anchor);
    			append(h4, t);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(h4);
    		}
    	};
    }

    // (48:10) <Column style={"padding:1rem"}>
    function create_default_slot_3(ctx) {
    	let h3;
    	let t0;
    	let t1_value = /*details*/ ctx[8].stargazers_count + "";
    	let t1;
    	let t2;
    	let t3;
    	let br0;
    	let t4;
    	let h40;
    	let t6;
    	let link0;
    	let t7;
    	let br1;
    	let t8;
    	let h41;
    	let t10;
    	let link1;
    	let t11;
    	let br2;
    	let t12;
    	let br3;
    	let t13;
    	let p0;
    	let t14;
    	let t15_value = /*details*/ ctx[8].updated_at + "";
    	let t15;
    	let t16;
    	let br4;
    	let t17;
    	let p1;
    	let t18_value = /*details*/ ctx[8].description + "";
    	let t18;
    	let current;

    	link0 = new Link({
    			props: {
    				href: /*details*/ ctx[8].owner.html_url,
    				target: "_blank",
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			}
    		});

    	link1 = new Link({
    			props: {
    				href: /*details*/ ctx[8].html_url,
    				target: "_blank",
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			h3 = element("h3");
    			t0 = text("⭐");
    			t1 = text(t1_value);
    			t2 = text("⭐");
    			t3 = space();
    			br0 = element("br");
    			t4 = space();
    			h40 = element("h4");
    			h40.textContent = "author:";
    			t6 = space();
    			create_component(link0.$$.fragment);
    			t7 = space();
    			br1 = element("br");
    			t8 = space();
    			h41 = element("h4");
    			h41.textContent = "title:";
    			t10 = space();
    			create_component(link1.$$.fragment);
    			t11 = space();
    			br2 = element("br");
    			t12 = space();
    			br3 = element("br");
    			t13 = space();
    			p0 = element("p");
    			t14 = text("latest commit: ");
    			t15 = text(t15_value);
    			t16 = space();
    			br4 = element("br");
    			t17 = space();
    			p1 = element("p");
    			t18 = text(t18_value);
    			attr(h40, "class", "svelte-shxzpm");
    			attr(h41, "class", "svelte-shxzpm");
    		},
    		m(target, anchor) {
    			insert(target, h3, anchor);
    			append(h3, t0);
    			append(h3, t1);
    			append(h3, t2);
    			insert(target, t3, anchor);
    			insert(target, br0, anchor);
    			insert(target, t4, anchor);
    			insert(target, h40, anchor);
    			insert(target, t6, anchor);
    			mount_component(link0, target, anchor);
    			insert(target, t7, anchor);
    			insert(target, br1, anchor);
    			insert(target, t8, anchor);
    			insert(target, h41, anchor);
    			insert(target, t10, anchor);
    			mount_component(link1, target, anchor);
    			insert(target, t11, anchor);
    			insert(target, br2, anchor);
    			insert(target, t12, anchor);
    			insert(target, br3, anchor);
    			insert(target, t13, anchor);
    			insert(target, p0, anchor);
    			append(p0, t14);
    			append(p0, t15);
    			insert(target, t16, anchor);
    			insert(target, br4, anchor);
    			insert(target, t17, anchor);
    			insert(target, p1, anchor);
    			append(p1, t18);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const link0_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);
    			const link1_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				link1_changes.$$scope = { dirty, ctx };
    			}

    			link1.$set(link1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);
    			transition_in(link1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h3);
    			if (detaching) detach(t3);
    			if (detaching) detach(br0);
    			if (detaching) detach(t4);
    			if (detaching) detach(h40);
    			if (detaching) detach(t6);
    			destroy_component(link0, detaching);
    			if (detaching) detach(t7);
    			if (detaching) detach(br1);
    			if (detaching) detach(t8);
    			if (detaching) detach(h41);
    			if (detaching) detach(t10);
    			destroy_component(link1, detaching);
    			if (detaching) detach(t11);
    			if (detaching) detach(br2);
    			if (detaching) detach(t12);
    			if (detaching) detach(br3);
    			if (detaching) detach(t13);
    			if (detaching) detach(p0);
    			if (detaching) detach(t16);
    			if (detaching) detach(br4);
    			if (detaching) detach(t17);
    			if (detaching) detach(p1);
    		}
    	};
    }

    // (38:8) <Row>
    function create_default_slot_2(ctx) {
    	let column0;
    	let t;
    	let column1;
    	let current;

    	column0 = new Column({
    			props: {
    				style: "padding:0",
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			}
    		});

    	column1 = new Column({
    			props: {
    				style: "padding:1rem",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(column0.$$.fragment);
    			t = space();
    			create_component(column1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(column0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(column1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const column0_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				column0_changes.$$scope = { dirty, ctx };
    			}

    			column0.$set(column0_changes);
    			const column1_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				column1_changes.$$scope = { dirty, ctx };
    			}

    			column1.$set(column1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(column0.$$.fragment, local);
    			transition_in(column1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(column0.$$.fragment, local);
    			transition_out(column1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(column0, detaching);
    			if (detaching) detach(t);
    			destroy_component(column1, detaching);
    		}
    	};
    }

    // (37:6) <Grid style={"padding:0"}>
    function create_default_slot_1$1(ctx) {
    	let row;
    	let current;

    	row = new Row({
    			props: {
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(row.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(row, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const row_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				row_changes.$$scope = { dirty, ctx };
    			}

    			row.$set(row_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(row.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(row.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(row, detaching);
    		}
    	};
    }

    // (1:0) <script lang="ts">var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {     function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }
    function create_catch_block(ctx) {
    	return { c: noop, m: noop, p: noop, d: noop };
    }

    // (72:57)            {readme}
    function create_then_block_1(ctx) {
    	let t_value = /*readme*/ ctx[9] + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (1:0) <script lang="ts">var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {     function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }
    function create_pending_block_1(ctx) {
    	return { c: noop, m: noop, p: noop, d: noop };
    }

    // (28:2) <Modal     passiveModal     size="lg"     modalHeading={details.full_name}     bind:open     on:open     on:close   >
    function create_default_slot$2(ctx) {
    	let div;
    	let grid;
    	let t;
    	let p;
    	let current;

    	grid = new Grid({
    			props: {
    				style: "padding:0",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			}
    		});

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block,
    		value: 9
    	};

    	handle_promise(getReadme(/*details*/ ctx[8].full_name), info);

    	return {
    		c() {
    			div = element("div");
    			create_component(grid.$$.fragment);
    			t = space();
    			p = element("p");
    			info.block.c();
    			attr(p, "style", "white-space: pre-wrap");
    			attr(div, "class", "repo-details svelte-shxzpm");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(grid, div, null);
    			append(div, t);
    			append(div, p);
    			info.block.m(p, info.anchor = null);
    			info.mount = () => p;
    			info.anchor = null;
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const grid_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				grid_changes.$$scope = { dirty, ctx };
    			}

    			grid.$set(grid_changes);
    			update_await_block_branch(info, ctx, dirty);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(grid.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(grid.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(grid);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};
    }

    // (1:0) <script lang="ts">var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {     function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }
    function create_pending_block(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    function create_fragment$3(ctx) {
    	let await_block_anchor;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block_1,
    		value: 8,
    		blocks: [,,,]
    	};

    	handle_promise(/*detailsPromise*/ ctx[1], info);

    	return {
    		c() {
    			await_block_anchor = empty();
    			info.block.c();
    		},
    		m(target, anchor) {
    			insert(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    			current = true;
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			update_await_block_branch(info, ctx, dirty);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	
    	let { open = false } = $$props;
    	let { fullName } = $$props;

    	function getData(fullName) {
    		return __awaiter(this, void 0, void 0, function* () {
    			const data = yield get(`https://api.github.com/repos/${fullName}`);
    			return data.parsedBody;
    		});
    	}

    	const detailsPromise = getData(fullName);

    	function modal_open_binding(value) {
    		open = value;
    		$$invalidate(0, open);
    	}

    	function open_handler(event) {
    		bubble($$self, event);
    	}

    	function close_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("open" in $$props) $$invalidate(0, open = $$props.open);
    		if ("fullName" in $$props) $$invalidate(2, fullName = $$props.fullName);
    	};

    	return [
    		open,
    		detailsPromise,
    		fullName,
    		modal_open_binding,
    		open_handler,
    		close_handler
    	];
    }

    class RepoDetails extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { open: 0, fullName: 2 });
    	}
    }

    /* src/components/Search.svelte generated by Svelte v3.38.2 */

    function create_fragment$2(ctx) {
    	let search_1;
    	let current;
    	search_1 = new Search({});
    	search_1.$on("clear", /*search*/ ctx[0]);
    	search_1.$on("change", /*search*/ ctx[0]);

    	return {
    		c() {
    			create_component(search_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(search_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(search_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(search_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(search_1, detaching);
    		}
    	};
    }

    function instance$2($$self) {
    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	
    	const dispatch = createEventDispatcher();

    	function search(e) {
    		return __awaiter(this, void 0, void 0, function* () {
    			if (e.type !== "clear") {
    				// @ts-ignore
    				const data = yield getData(e.target.value);

    				dispatch("searchResults", { results: data.items });
    			} else {
    				dispatch("searchResults", { results: undefined });
    			}
    		});
    	}

    	function getData(query) {
    		return __awaiter(this, void 0, void 0, function* () {
    			const data = yield get(`https://api.github.com/search/repositories?q=${query}&page=0&per_page=100`);
    			return data.parsedBody;
    		});
    	}

    	return [search];
    }

    class Search_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
    	}
    }

    /* src/components/Repos.svelte generated by Svelte v3.38.2 */

    function create_if_block(ctx) {
    	let datatable;
    	let current;

    	datatable = new DataTable({
    			props: {
    				sortable: true,
    				headers: [
    					{ key: "owner.login", value: "Author" },
    					{ key: "name", value: "Title" },
    					{
    						key: "updated_at",
    						value: "Latest Commit"
    					},
    					{ key: "stargazers_count", value: "Stars" }
    				],
    				rows: /*repos*/ ctx[3],
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	datatable.$on("click:row", /*onClickRow*/ ctx[6]);

    	return {
    		c() {
    			create_component(datatable.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(datatable, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const datatable_changes = {};
    			if (dirty & /*repos*/ 8) datatable_changes.rows = /*repos*/ ctx[3];

    			if (dirty & /*$$scope, selectedRepo, showDetails, reposData*/ 16391) {
    				datatable_changes.$$scope = { dirty, ctx };
    			}

    			datatable.$set(datatable_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(datatable.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(datatable.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(datatable, detaching);
    		}
    	};
    }

    // (88:4) {#if showDetails}
    function create_if_block_1(ctx) {
    	let repodetails;
    	let current;

    	repodetails = new RepoDetails({
    			props: {
    				fullName: /*selectedRepo*/ ctx[1],
    				open: true
    			}
    		});

    	repodetails.$on("close", /*close_handler*/ ctx[9]);

    	return {
    		c() {
    			create_component(repodetails.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(repodetails, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const repodetails_changes = {};
    			if (dirty & /*selectedRepo*/ 2) repodetails_changes.fullName = /*selectedRepo*/ ctx[1];
    			repodetails.$set(repodetails_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(repodetails.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(repodetails.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(repodetails, detaching);
    		}
    	};
    }

    // (72:2) <DataTable     sortable     headers={[       { key: "owner.login", value: "Author" },       { key: "name", value: "Title" },       { key: "updated_at", value: "Latest Commit" },       { key: "stargazers_count", value: "Stars" },     ]}     rows={repos}     on:click:row={onClickRow}   >
    function create_default_slot$1(ctx) {
    	let pagination;
    	let t;
    	let if_block_anchor;
    	let current;

    	pagination = new Pagination({
    			props: {
    				totalItems: /*reposData*/ ctx[2].length,
    				pageSizes: /*pageSizes*/ ctx[4]
    			}
    		});

    	pagination.$on("update", /*update_handler*/ ctx[8]);
    	let if_block = /*showDetails*/ ctx[0] && create_if_block_1(ctx);

    	return {
    		c() {
    			create_component(pagination.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			mount_component(pagination, target, anchor);
    			insert(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const pagination_changes = {};
    			if (dirty & /*reposData*/ 4) pagination_changes.totalItems = /*reposData*/ ctx[2].length;
    			pagination.$set(pagination_changes);

    			if (/*showDetails*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showDetails*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(pagination.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(pagination.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(pagination, detaching);
    			if (detaching) detach(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let search;
    	let t;
    	let if_block_anchor;
    	let current;
    	search = new Search_1({});
    	search.$on("searchResults", /*handleSearch*/ ctx[7]);
    	let if_block = /*reposData*/ ctx[2] && create_if_block(ctx);

    	return {
    		c() {
    			create_component(search.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			mount_component(search, target, anchor);
    			insert(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*reposData*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*reposData*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(search.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(search.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(search, detaching);
    			if (detaching) detach(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function handlePages(pageSize, page, data) {
    	return data && data.slice(page, pageSize + page);
    }

    function instance$1($$self, $$props, $$invalidate) {
    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	
    	let showDetails;
    	let selectedRepo;
    	const pageSizes = [10, 15, 20];
    	let reposData;
    	let repos;

    	onMount(() => __awaiter(void 0, void 0, void 0, function* () {
    		yield initReposData();
    	}));

    	function getData(sinceId = 1) {
    		return __awaiter(this, void 0, void 0, function* () {
    			const data = yield get(`https://api.github.com/repositories?since${sinceId}`);
    			return data.parsedBody;
    		});
    	}

    	function initReposData() {
    		return __awaiter(this, void 0, void 0, function* () {
    			$$invalidate(2, reposData = yield getData());
    			$$invalidate(3, repos = handlePages(pageSizes[0], 0, reposData));
    			$$invalidate(3, repos = yield getRepoExtras(repos));
    		});
    	}

    	function onUpdate(event, data) {
    		return __awaiter(this, void 0, void 0, function* () {
    			const { pageSize, page } = event.detail;
    			$$invalidate(3, repos = handlePages(pageSize, page, data));
    			$$invalidate(3, repos = yield getRepoExtras(repos));
    		});
    	}

    	function onClickRow(event) {
    		$$invalidate(1, selectedRepo = event.detail.full_name);
    		$$invalidate(0, showDetails = true);
    	}

    	function getRepoExtras(repos) {
    		return __awaiter(this, void 0, void 0, function* () {
    			return Promise.all(repos.map(repo => get(`https://api.github.com/repos/${repo.full_name}`).then(data => data.parsedBody)));
    		});
    	}

    	function handleSearch(e) {
    		return __awaiter(this, void 0, void 0, function* () {
    			if (e.detail.results) {
    				$$invalidate(2, reposData = e.detail.results);
    				$$invalidate(3, repos = handlePages(pageSizes[0], 0, reposData));
    			} else {
    				yield initReposData();
    			}
    		});
    	}

    	const update_handler = e => onUpdate(e, reposData);
    	const close_handler = () => $$invalidate(0, showDetails = false);

    	return [
    		showDetails,
    		selectedRepo,
    		reposData,
    		repos,
    		pageSizes,
    		onUpdate,
    		onClickRow,
    		handleSearch,
    		update_handler,
    		close_handler
    	];
    }

    class Repos extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.2 */

    function create_default_slot_1(ctx) {
    	let repos;
    	let current;
    	repos = new Repos({});

    	return {
    		c() {
    			create_component(repos.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(repos, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(repos.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(repos.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(repos, detaching);
    		}
    	};
    }

    // (8:0) <Theme persist bind:theme>
    function create_default_slot(ctx) {
    	let header;
    	let t;
    	let content;
    	let current;
    	header = new Header({});
    	header.$on("themeSelected", /*themeSelected_handler*/ ctx[1]);

    	content = new Content({
    			props: {
    				style: "background: none; padding: 1rem",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(header.$$.fragment);
    			t = space();
    			create_component(content.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(header, target, anchor);
    			insert(target, t, anchor);
    			mount_component(content, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const content_changes = {};

    			if (dirty & /*$$scope*/ 8) {
    				content_changes.$$scope = { dirty, ctx };
    			}

    			content.$set(content_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(content.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(content.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach(t);
    			destroy_component(content, detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let theme_1;
    	let updating_theme;
    	let current;

    	function theme_1_theme_binding(value) {
    		/*theme_1_theme_binding*/ ctx[2](value);
    	}

    	let theme_1_props = {
    		persist: true,
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	if (/*theme*/ ctx[0] !== void 0) {
    		theme_1_props.theme = /*theme*/ ctx[0];
    	}

    	theme_1 = new Theme({ props: theme_1_props });
    	binding_callbacks.push(() => bind(theme_1, "theme", theme_1_theme_binding));

    	return {
    		c() {
    			create_component(theme_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(theme_1, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const theme_1_changes = {};

    			if (dirty & /*$$scope, theme*/ 9) {
    				theme_1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_theme && dirty & /*theme*/ 1) {
    				updating_theme = true;
    				theme_1_changes.theme = /*theme*/ ctx[0];
    				add_flush_callback(() => updating_theme = false);
    			}

    			theme_1.$set(theme_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(theme_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(theme_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(theme_1, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let theme = "g10";
    	const themeSelected_handler = e => $$invalidate(0, theme = e.detail.theme);

    	function theme_1_theme_binding(value) {
    		theme = value;
    		$$invalidate(0, theme);
    	}

    	return [theme, themeSelected_handler, theme_1_theme_binding];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const app = new App({ target: document.body });

    return app;

}());
//# sourceMappingURL=bundle.js.map
