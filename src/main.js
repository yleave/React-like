// import React from 'react';
// import ReactDOM from 'react-dom';
import Didact from './Didact';

// /** @jsx Didact.createElement */
// const element = (
//     <div style="background: salmon">
//       <h1>Hello World</h1>
//       <h2 style="text-align:right">from Didact</h2>
//     </div>
// );

// console.log(element)

// Didact.render(
//     element,
//     document.getElementById('root')
// );

const didact = new Didact();

/** @jsx didact.createElement */
function Counter() {
  const [state, setState] = didact.useState(1);
  return (
    <h1 onClick={() => setState(c => c + 1)}>
      Count: {state}
    </h1>
  );
}
const element = <Counter />;
const container = document.getElementById("root");
didact.render(element, container);


// /** @jsx didact.createElement */
// const container = document.getElementById("root")

// const updateValue = e => {
//   rerender(e.target.value)
// }

// const rerender = value => {
//   const element = (
//     <div>
//       <input onInput={updateValue} value={value} />
//       <h2>Hello {value}</h2>
//     </div>
//   )

//   didact.render(element, container)
// }

// rerender("World")

// let text = 'world';
// const ele = <h1>123 {text}</h1>
// console.log(ele)
