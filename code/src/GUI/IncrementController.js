import { html2element } from "../helpers.js"; 

/*
On input increments should be launched. But if the user wants repeated increments they have to wiggle the mouse. Is it possible to keep launching the event even if the user has the cursor stationary? Maybe based on the value, which should be 0 if the cursor has been released. And update every half a second or so? Or faster? Maybe 20 frames per second?



*/

export default class IncrementController{
	
  a=-1
  b=1
	
  constructor(label){
	let obj = this;
	obj.node = html2element(`
      <div style="float: right;">
        <label style="color: white;">${ label }</label>
        <input class="range" type="range" min="-1" max="1" value="0" step="0.05">
      </div>
    `);
	
	let i = obj.node.querySelector("input");

	// No need to recalculate the mean value - it's always 0. Only the value released to the user is recalculated.
	i.addEventListener("mouseout", function(){i.value = 0;});
	i.addEventListener("mouseup", function(){i.value = 0;});
  
  } // constructor
  
  get value(){
	  let obj = this;
	  return ((Number(obj.node.querySelector("input").value) +  1)/2 )*(obj.b - obj.a) + obj.a;
  } // get value
} // IncrementController



// Apply incremental behavior to a lil-gui controller.
export function applyIncrementalBehavior(controller, config, property, callback){
	let timer = undefined;
	let rate = undefined;
	function increment(v, callback){
		if(rate == v){
			callback(v);
			timer = setTimeout(function(){increment(v, callback)},200)
		} // if
	} // increment

	controller.onChange(function(v){
		clearTimeout(timer);
		rate = v;
		increment(v, callback)
	}).onFinishChange(function(){
		clearTimeout(timer);
		rate = undefined;
		config[property] = ( controller._max + controller._min ) / 2;
		controller.updateDisplay();
	}) // events
} // applyIncrementalBehavior