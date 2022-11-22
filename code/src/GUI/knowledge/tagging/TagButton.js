import { html2element } from "../../../helpers.js";


// The buttons are toggled on/off to filter the comments!!
export default class TagButton{
  constructor(tag){
    let obj = this;
	obj.tag = tag;
	obj.node = html2element(`<button class="btn-small">#${tag.name}</button>`);
    obj.on = true;	
	
	// On mouseover the tags should be highlighted. To highlight geometrical tags the corresponding SVG must be made visible.
	  
	
	// Onclick the buttons should filter the comments, and toggle the annotations.
	obj.node.onmousedown = function(e){
	  e.stopPropagation();
	  obj.toggle(!obj.on);
	} // onclick
	
	
	// Turn button off as default.
	obj.toggle(false);
  } // constructor
  
  toggle(on){
	// if on == true then turn the button on, otherwise turn it off.
	let obj = this;
    obj.node.style.background = on ? "black" : "gainsboro";
	obj.node.style.color = on ? "white" : "black";
	obj.on = on;
  } // toggle
  
} // TagButton