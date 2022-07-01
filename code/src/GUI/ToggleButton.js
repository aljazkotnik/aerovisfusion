import { html2element } from "../helpers.js"; 


export default class ToggleButton{
  
  on = false
  
  constructor(unicodeemoji){
    let obj = this;
	
	let label = unicodeemoji ? unicodeemoji : `🧽`;
	
	obj.node = html2element(`
      <div style="float: right;">
	    <button class="icon">${ label }</button>
      </div>
    `);
	
	obj.node.onclick = function(){
		// Toggle the button, and change its appearance.
		obj.on = !obj.on;
		obj.node.querySelector("button").style.border = `2px solid ${ obj.on ? "gainsboro" : "black" }`;
	} // onclick
  } // constructor
} // ToggleButton