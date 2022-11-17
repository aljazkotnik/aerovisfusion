
import { html2element } from "../helpers.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "stats.js";
// import PlayBarSlider from "./PlayBarSlider.js"



const template = `
<div class="hud">
  <div class="stats"></div>
  <div class="righttop"></div>
  <div class="centerbottom"></div>
</div>
`;


export default class SessionGUI{
	constructor(elementOptions){
		let obj = this;
		obj.dom = html2element(template);
		
		
		
		// Add the Stats object.
		obj.stats = new Stats();
		obj.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
		obj.dom.querySelector("div.stats").appendChild( obj.stats.dom );
		
		
		
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
		
		
		
		
		// Add the playbar object centered in the bottom.
		// obj.playbar = new PlayBarSlider(1,229,1);
		// obj.dom.querySelector("div.centerbottom").appendChild( obj.playbar.dom );
		
		
	} // constructor
	
	update(){
		let obj = this;
		obj.stats.update();
	}
} // SessionGUI	
	
	
