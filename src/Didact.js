const Didact = (function() {
    let nextUnitOfWork = null;
    let wipRoot = null;
    let currentRoot = null;
    let deletions = null;
    let wipFiber = null;
    let hookIndex = null;

    const isProperty = key => key !== 'children' && !isEvent(key);
    const isNew = (prev, next) => key => prev[key] !== next[key];
    const isGone = (prev, next) => key => !(key in next);
    const isEvent = key => key.startsWith('on');

    
    function Didact() {
        requestIdleCallback(workloop);
    }

    function createTextElement(text) {
        return {
            type: 'TEXT_ELEMENT',
            props: {
                nodeValue: text,
                children: []
            },
        };
    }

    Didact.prototype.createElement = function (type, props, ...children) {

        return {
            type,
            props: {
                ...props,
                // 对于基本数据类型，如 number 或 string，为了统一处理，我们对其进行额外处理，将其标记为 TEXT_ELEMENT
                // 而实际上 React 的实现中，它并不会对这些基本数据类型进行包装或是创建一个新的空数组，这样做是为了简化我们的 react 逻辑
                children: children.map(child => (
                    typeof child === 'object'
                        ? child
                        : createTextElement(child)
                )),
            },
        };
    };

    function createDom(fiber) {
        // 首先根据 fiber 的 type 创建一个 dom 元素
        const dom = fiber.type === 'TEXT_ELEMENT'
            ? document.createTextNode('')
            : document.createElement(fiber.type);
    
        updateDom(dom, {}, fiber.props)
    
        return dom;
    };
    
    function commitRoot() {
        deletions.forEach(commitWork);
        commitWork(wipRoot.child);
        currentRoot = wipRoot;
        wipRoot = null;
    }

    function updateDom(dom, prevProps, nextProps) {
        // remove old or changed event listeners
        Object.keys(prevProps)
            .filter(isEvent)
            .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key)) // 这边的 isNew 用于移除变更的事件处理函数
            .forEach(name => {
                const eventType = name
                    .toLowerCase()
                    .substring(2);
                dom.removeEventListener(eventType, prevProps[name]);
            });
    
        // remove old properties
        Object.keys(prevProps)
            .filter(isProperty)
            .filter(isGone(prevProps, nextProps))
            .forEach(name => {
                dom[name] = '';
            });
    
        // set new or changed properties
        Object.keys(nextProps)
            .filter(isProperty)
            .filter(isNew(prevProps, nextProps))
            .forEach(name => {
                dom[name] = nextProps[name];
            });
        
        // add event listeners
        Object.keys(nextProps)
            .filter(isEvent)
            .filter(isNew(prevProps, nextProps))
            .forEach(name => {
                const eventType = name
                    .toLowerCase()
                    .substring(2);
                dom.addEventListener(eventType, nextProps[name]);
            });
    }
    
    function commitWork(fiber) {
        if (!fiber) return;
        
        let domParentFiber = fiber.parent;

        while (!domParentFiber.dom) {
            domParentFiber = domParentFiber.parent;
        }

        const domParent = domParentFiber.dom;
    
        if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
            domParent.appendChild(fiber.dom);
        } else if (fiber.effectTag === 'DELETION') {
            commitDeletion(fiber, domParent);
        } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
            updateDom(fiber.dom, fiber.alternate.props, fiber.props);
        }
    
        commitWork(fiber.child);
        commitWork(fiber.sibling);
    }

    function commitDeletion(fiber, domParent) {
        if (fiber.dom) {
            domParent.removeChild(fiebr.dom);
        } else {
            domParent.removeChild(fiber.child, domParent);
        }
    }

    Didact.prototype.render = function(element, container) {
        wipRoot = {
            dom: container,
            props: {
                children: [element],
            },
            alternate: currentRoot,
        };
    
        deletions = [];
        nextUnitOfWork = wipRoot;
    }

    function workloop(deadline) {
        let shouldYield = false;

        while (nextUnitOfWork && !shouldYield) {
            nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
            shouldYield = deadline.timeRemaining() < 1;
        }
    
        if (!nextUnitOfWork && wipRoot) {
            commitRoot();
        }
    
        requestIdleCallback(workloop);
    }

    function performUnitOfWork(fiber) {
        if (fiber.type instanceof Function) {
            updateFunctionComponent(fiber);
        } else {
            updateHostComponent(fiber);
        }
    
        // return next unit of work
        
        if (fiber.child) return fiber.child;
    
        let nextFiber = fiber;
        while (nextFiber) {
            if (nextFiber.sibling) return nextFiber.sibling;
    
            nextFiber = nextFiber.parent;
        }
    }
    
    function updateHostComponent(fiber) {
        // add dom node
        if (!fiber.dom) {
            fiber.dom = createDom(fiber);
        }
    
        const elements = fiber.props.children;
        reconcileChildren(fiber, elements.flat());
    }

    function updateFunctionComponent(fiber) {
        wipFiber = fiber;
        hookIndex = 0;
        wipFiber.hooks = [];

        const elements = [fiber.type(fiber.props)];
        reconcileChildren(fiber, elements.flat());
    }

    Didact.prototype.useState = function(initial) {
        const oldHook = 
            wipFiber.alternate &&
            wipFiber.alternate.hooks &&
            wipFiber.alternate.hooks[hookIndex];

        const hook = {
            state: oldHook ? oldHook.state : initial,
            queue: []
        };

        const actions = oldHook ? oldHook.queue : [];
        actions.forEach(action => {
            hook.state = action(hook.state);
        });

        const setState = action => {
            hook.queue.push(action);
            wipRoot = {
                dom: currentRoot.dom,
                props: currentRoot.props,
                alternate: currentRoot
            };

            nextUnitOfWork = wipRoot;
            deletions = [];
        };

        wipFiber.hooks.push(hook);
        hookIndex++;

        return [hook.state, setState];
    };

    function reconcileChildren(wipFiber, elements) {
        // create new fiber
        let index = 0;
        let prevSibling = null;
        let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
    
        while (index < elements.length || oldFiber != null) {
            const element = elements[index];
            let newFiber = null;
            
            const sameType = oldFiber && element && element.type === oldFiber.type;
    
            // update the node
            if (sameType) {
                newFiber = {
                    type: oldFiber.type,
                    props: element.props,
                    dom: oldFiber.dom,
                    parent: wipFiber,
                    alternate: oldFiber,
                    effectTag: 'UPDATE',
                };
            }
    
            // add this node
            if (element && !sameType) {
                newFiber = {
                    type: element.type,
                    props: element.props,
                    dom: null,
                    parent: wipFiber,
                    alternate: null,
                    effectTag: 'PLACEMENT',
                };
            }
    
            // delete the oldFiber's node
            if (oldFiber && !sameType) {
                oldFiber.effectTag = 'DELETION';
                deletions.push(oldFiber);
            }
    
            if (oldFiber) {
                oldFiber = oldFiber.sibling;
            }
    
            if (index === 0) {
                wipFiber.child = newFiber;
            } else {
                prevSibling.sibling = newFiber;
            }
    
            prevSibling = newFiber;
            index++;
        }
    }

    return Didact;
})()

export default Didact;