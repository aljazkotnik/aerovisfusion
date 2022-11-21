
import { html2element } from "../helpers.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "stats.js";
// import PlayBarSlider from "./PlayBarSlider.js"
import AnnotationSystem from "./knowledge/AnnotationSystem.js";


const template = `
<div class="hud">
  <div class="stats"></div>
  <div class="lefttop"></div>
  <div class="righttop"></div>
</div>
`;


export default class SessionGUI{
	constructor(elementOptions, renderer, scene, camera){
		let obj = this;
		obj.dom = html2element(template);
		
		
		
		// Add the Stats object.
		obj.stats = new Stats();
		obj.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
		obj.dom.querySelector("div.stats").appendChild( obj.stats.dom );
		obj.stats.dom.style.left = "";
		obj.stats.dom.style.top = "";
		obj.stats.dom.style.right = "0px";
		obj.stats.dom.style.bottom = "0px";
		
		
		// Annotations. Input is a `taskId'
		obj.annotations = new AnnotationSystem("Delta wing", renderer, scene, camera);
		obj.dom.querySelector("div.lefttop").appendChild( obj.annotations.dom );
		
		
		// The overall gui should only contain folders.
		obj.session = new GUI({
			container: obj.dom.querySelector("div.controls"),
			title: "Session controls"
		});
		
		// Folder for individual elements
		obj.elements = obj.session.addFolder("Elements");
		
		
		if(elementOptions){
			// Folder for addition of elements, which should have a dropdown to select element type, 
			// textbox to specify the file name, and a submit button.
			const addElementGUI = obj.session.addFolder("Add element");


			// The button should open a modal, or append a selection to the GUI to configure the element to be added.
			const addElementConfig = {
				type: '',
				name: 'type in asset address',
				add: function(el){
					// Evaluate the current config and clear it.
					if( elementOptions[addElementConfig.type] ){
						let f = elementOptions[addElementConfig.type];
						f(addElementConfig.name);
					} // if
					
				} // add
			}

			addElementGUI.add( addElementConfig, "type", [''].concat( Object.keys(elementOptions)) ) // dropdown
			addElementGUI.add( addElementConfig, "name" ); 	// text field
			addElementGUI.add( addElementConfig, "add" ); 	// button
		} // if
		
		
	} // constructor
	
	update(){
		let obj = this;
		obj.stats.update();
	}
} // SessionGUI	
	
	
