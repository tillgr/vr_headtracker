// The three.js scene: the 3D world where you put objects
const scene = new THREE.Scene();

// The renderer: something that draws 3D objects onto the canvas
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xaaaaaa, 1);
// Append the renderer canvas into <body>
document.body.appendChild(renderer.domElement);


const gl = renderer.domElement.getContext('webgl');

// Function called automatically when window is resized. This will resize our renderer buffer and calculate new aspect ratios and FOV for our cameras
window.addEventListener('resize', onWindowResize, false);

// Add GUI to control parameters in the scene
var params = {
  'IPD': 0.000, 'Convergence': 0.5, // distance in front of camera 
  'Converge': true, // if false, convergence is effectively set at infinity.. 
  'CameraX': 0.0,
  'CameraY': 0.0,
  'CameraZ': 0.5,
  'Stereo': true,
  'OffAxis': true,
  'ToeIn': false,
  'ScreenWidth': 0.52, // Physical dimensions of screen, in metres. Measure your window! 
  'TrackerScale': 0.02
};

// Use the Repl Package system to add Dat.GUI
const gui = new dat.GUI();
const stereoButton = gui.add(params, 'Stereo', true); // need to keep for later.. 
gui.add(params, 'IPD', -0.2, 0.2);
gui.add(params, 'Convergence', 0.01, 10);
gui.add(params, 'Converge', true);
gui.add(params, 'CameraX', -1, 1);
gui.add(params, 'CameraY', -1, 1);
gui.add(params, 'CameraZ', 0, 10);
gui.add(params, 'OffAxis', false).onChange(function toggleA() { params.ToeIn = !params.OffAxis; }).listen();
gui.add(params, 'ToeIn', false).onChange(function toggleB() { params.OffAxis = !params.ToeIn; }).listen();
gui.add(params, 'ScreenWidth', 0.05, 0.60);

//Light
const light = new THREE.DirectionalLight(0xffffff);
light.position.set(1, 2, 0.8);
scene.add(light);

//create WorldBox
const worldBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshPhongMaterial({ color: 0x909090, side: THREE.BackSide }));
scene.add(worldBox);

// The camera
const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 10);

// Variables for storing the window dimensions in real world (in metres) 
var windowWidth, windowHeight;
onWindowResize(); // Set up our camera fov and aspect ratio to match window


// Create stereo cameras and attach them as children of our centre camera 
const cameraL = camera.clone();
const cameraR = camera.clone();
cameraR.parent = camera;
cameraL.parent = camera;

//creat trees and forest groups
let tree = new THREE.Group();
const forest = new THREE.Group();

function render_a_low_poly_tree(x, y, z) {
  // A cube we are going to animate
  const cube = {
    // The geometry: the shape & size of the object
    geometry: new THREE.BoxGeometry(0.5, 2, 0.5),
    // The material: the appearance (color, texture) of the object
    material: new THREE.MeshPhongMaterial({ color: 0xffffff })
  };

  const cone = {
    geometry: new THREE.ConeGeometry(1, 2, 32),

    material: new THREE.MeshPhongMaterial({ color: 0x00ff00 })
  };

  cube.mesh = new THREE.Mesh(cube.geometry, cube.material);
  cube.mesh.position.set(x, y, z);
  cone.mesh = new THREE.Mesh(cone.geometry, cone.material);
  cone.mesh.position.set(x + 0, y + 2, z + 0);

  tree.add(cube.mesh);
  tree.add(cone.mesh);

  forest.add(tree);
}

function render_a_forest(num_of_trees) {

  let min = 0;
  let max = 10;

  for (let i = 1; i <= num_of_trees; i++) {

    let x = Math.random() * (max - min) + min;
    let z = Math.random() * (max - min) + min;

    render_a_low_poly_tree(x, 0, z);
  }
}

render_a_forest(20)

scene.add(forest);
//move forest inside of the box
let scalar = 0.015;
forest.scale.set(scalar, scalar, scalar);
forest.translateX(-0.1);
forest.translateZ(-0.25);

// Called only when the window is resized 
function onWindowResize() {
  // Calculate real-world window size (in metres) 
  const screenAspect = window.screen.width / window.screen.height;
  const screenHeight = params.ScreenWidth / screenAspect;

  // window size in real-world scale (metres) 
  windowWidth = (window.innerWidth / window.screen.width) * params.ScreenWidth;
  windowHeight = (window.innerHeight / window.screen.height) * screenHeight;

  // rescale our world to match the window 
  worldBox.scale.set(windowWidth, windowHeight, windowWidth * 2); worldBox.position.set(0, 0, -windowWidth);

  // Adjust the camera aspect ratio to match the window aspect ratio 
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // resize the renderer buffers 
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/*========================================*/
/*Headtracker*/
const trackedHeadPos = new THREE.Vector3(0, 0, 0);
document.addEventListener('headtrackingEvent', function (event) {
  trackedHeadPos.x = event.x;
  trackedHeadPos.y = event.y;
  trackedHeadPos.z = event.z;
  //console.log(trackedHeadPos);
});

const cameraOffset = new THREE.Vector3(0, 0, 0);
var obj = {
  Calibrate: function () {
    cameraOffset.x = trackedHeadPos.x; 
    cameraOffset.y = trackedHeadPos.y;
    console.log("cameraOffset.x = " + cameraOffset.x);
    console.log("cameraOffset.y = " + cameraOffset.y);
  }
};
gui.add(obj, 'Calibrate');


function render() {
  //Calculate world position of the convergence point.
  const convergencePoint = new THREE.Vector3(0, 0, params.CameraZ - params.Convergence);
  //Use the lookAt method of convergence if selected
  if (params.Converge && params.ToeIn) {
    cameraL.lookAt(convergencePoint);
    cameraR.lookAt(convergencePoint);
  }


  params.CameraX = (trackedHeadPos.x - cameraOffset.x) * params.TrackerScale; 
  params.CameraY = (trackedHeadPos.y - cameraOffset.y) * params.TrackerScale;
  //console.log(params.CameraX)


  camera.position.set(params.CameraX, params.CameraY, params.CameraZ);
  camera.updateMatrixWorld();

  // Calculate new FOV given camera distance to window
  camera.fov = (180 / Math.PI) * (2 * Math.atan((windowHeight * 0.5) / params.CameraZ));

  // Note, this copies the FOV and the orientation and position. 
  cameraL.copy(camera);
  cameraR.copy(camera);

  // Update distance between left and right cameras
  const halfIPD = params.IPD * 0.5;
  cameraL.position.set(-halfIPD, 0, 0);
  cameraR.position.set(halfIPD, 0, 0);

  cameraR.updateMatrixWorld();
  cameraL.updateMatrixWorld();

  // Off-axis projection...
  if (params.OffAxis) {
    const screenHalfW = windowWidth * 0.5;
    const screenHalfH = windowHeight * 0.5;

    var offset = 0;
    if (params.Converge) {
      offset = ((params.Convergence - params.CameraZ) / params.Convergence) * (0.5 * params.IPD); // As in https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6175294/
    }

    cameraSetProjectionMatrix(camera, 0, screenHalfW, screenHalfH);
    cameraSetProjectionMatrix(cameraL, -offset, screenHalfW, screenHalfH);
    cameraSetProjectionMatrix(cameraR, +offset, screenHalfW, screenHalfH);
  }
  else {
    camera.updateProjectionMatrix();
    cameraL.updateProjectionMatrix();
    cameraR.updateProjectionMatrix();
  }

  gl.colorMask(true, false, false, false);
  renderer.render(scene, cameraL);
  gl.colorMask(false, true, true, false);
  renderer.render(scene, cameraR);

  requestAnimationFrame(render);
  //console.log(params)
}

// Code from https://github.com/Oblong/generalized-perspective-projection/blob/master/gen-perspective.pdf
// However, because we know our projection screen is centred at 0,0,0 and aligned with the x-axis, we can simplify our calculations...
function cameraSetProjectionMatrix(camera, offset, halfW, halfH) {
  const near = camera.near;
  const far = camera.far;

  var eyePos = new THREE.Vector3(0, 0, 0);
  camera.getWorldPosition(eyePos);

  // left and bottom are negative, top and right are positive
  var left = - halfW - eyePos.x;
  var right = halfW - eyePos.x;
  var top = halfH - eyePos.y;
  var bottom = -halfH - eyePos.y;

  // Shift the screen by an offset to control convergence
  left += offset;
  right += offset;

  // make_Frustum expects the top, bottom, left and right to be of the near plane of our frustum, not our projection screen. So scale the values...
  const nearOverDist = near / eyePos.z;

  left *= nearOverDist;
  right *= nearOverDist;
  top *= nearOverDist;
  bottom *= nearOverDist;

  // These are all equivalent...
  make_Frustum(camera.projectionMatrix, left, right, bottom, top, near, far);
  //camera.projectionMatrix.makePerspective( left, right, top, bottom, near, far);
  //camera.projectionMatrix.make_Frustum( left, right, top, bottom, near, far);
}

// Create an off-axis projection matrix. Mimics glFrustum
function make_Frustum(M, left, right, bottom, top, znear, zfar) {
  var X = 2 * znear / (right - left);
  var Y = 2 * znear / (top - bottom);
  var A = (right + left) / (right - left);
  var B = (top + bottom) / (top - bottom);
  var C = -(zfar + znear) / (zfar - znear);
  var D = -2 * zfar * znear / (zfar - znear);

  M.set(X, 0, A, 0,
    0, Y, B, 0,
    0, 0, C, D,
    0, 0, -1, 0);
}


render();

