import { html2element } from "../../../helpers.js";
import TagButton from "./TagButton.js";

let template = `<div style="width: 300px; margin-top: 5px;"></div>`;

export default class TagOverview{
  
  tags = [];
  buttons = [];
  
  constructor(){
    let obj = this;
	obj.node = html2element(template);
	// The tag visualisation should happen here also.
  } // constructor
  
  add(newtags){
	let obj = this;
	newtags.forEach(t=>obj.tags.push(t));
	
	
	let newbuttons = newtags.map(tag=>{return new TagButton(tag)}) // map
	newbuttons.forEach(b=>{
	  obj.buttons.push(b);
	  obj.node.appendChild(b.node);
	  
	  b.node.onmouseover = function(){
		obj.preview(b.tag);
	  } // onmouseover
	  b.node.onmouseout = function(){
		obj.previewend();
	  } // onmouseover
	  
	}) // forEach
	
	
	obj.communicatetags(obj.tags);
  } // add
  
  namevalid(name){
	// If any existing tag has this name the name is not valid.
	let obj = this;
	return !obj.tags.some(tag=>tag.name == name)
  } // namevalid
  
  
  purge(){
	let obj = this;
	obj.tags = [];
	obj.buttons.forEach(b=>b.node.remove());
	obj.buttons = [];
  } // purge
  
  
  
  // Dummy code. 
  preview(tag){
	// If the tag has geometry then the SVG should be turned on. This can only be done with access to the geometry annotation class.
  } // preview
  
  previewend(){
	// Stop the previewing by switching the SVG off - if it's not toggled on.
  } // previewend
  
  // The available tags need to be communicated to comments to highlight them in hte text.
  communicatetags(tagnames){} //communicatetags
  
} // TagOverview