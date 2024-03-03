import * as THREE from 'three'
import { Galaxy } from './objects/galaxy.js'
import { Star } from './objects/star.js'
import { Haze } from './objects/haze.js';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { CompositionShader } from './shaders/CompositionShader.js'
import { BASE_LAYER, BLOOM_LAYER, BLOOM_PARAMS, OVERLAY_LAYER } from "./config/renderConfig.js"

let canvas, renderer, camera, scene, orbit, baseComposer, bloomComposer, overlayComposer, galaxy

function generateBackgroundStars(numStars) {
    for (let i = 0; i < numStars; i++) {
        // Generate a random position for each background star
        const radius = Math.random() * 3000 + 100; // Ensure they're spawned well outside the galaxy core
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi); // Position stars around the scene in a spherical distribution

        // Create a new star at the generated position
        // Assuming the constructor can handle a THREE.Vector3 for position and a boolean for isStar
        const position = new THREE.Vector3(x, y, z);
        const backgroundStar = new Star(position, true); // Mark as a star
        backgroundStar.toThreeObject(scene); // Add the star's THREE.js object to the scene directly
    }
}

function initThree() {
    canvas = document.querySelector('#canvas')
    scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0xEBE2DB, 0.00003)

    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 5000000);
    camera.position.set(300, 500, 500); // Original position
    camera.up.set(0.5, 0, 1);
    const lookAtOffset = new THREE.Vector3(100, 0, 0);
    camera.lookAt(lookAtOffset);
    
    orbit = new MapControls(camera, canvas);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.05;
    orbit.screenSpacePanning = false;
    orbit.minDistance = 1;
    orbit.maxDistance = 16384;
    orbit.maxPolarAngle = Math.PI / 2 - Math.PI / 360;

    initRenderPipeline()
    galaxy = new Galaxy(scene)

    generateBackgroundStars(10000);
}

function initRenderPipeline() {
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvas,
        logarithmicDepthBuffer: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.5

    const renderScene = new RenderPass(scene, camera)

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85)
    bloomPass.threshold = BLOOM_PARAMS.bloomThreshold
    bloomPass.strength = BLOOM_PARAMS.bloomStrength
    bloomPass.radius = BLOOM_PARAMS.bloomRadius

    bloomComposer = new EffectComposer(renderer)
    bloomComposer.renderToScreen = false
    bloomComposer.addPass(renderScene)
    bloomComposer.addPass(bloomPass)

    overlayComposer = new EffectComposer(renderer)
    overlayComposer.renderToScreen = false
    overlayComposer.addPass(renderScene)

    const finalPass = new ShaderPass(
        new THREE.ShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture },
                overlayTexture: { value: overlayComposer.renderTarget2.texture }
            },
            vertexShader: CompositionShader.vertex,
            fragmentShader: CompositionShader.fragment,
            defines: {}
        }), 'baseTexture'
    )
    finalPass.needsSwap = true

    baseComposer = new EffectComposer(renderer)
    baseComposer.addPass(renderScene)
    baseComposer.addPass(finalPass)
}

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const needResize = canvas.width !== width || canvas.height !== height
    if (needResize) {
        renderer.setSize(width, height, false)
    }
    return needResize
}

function render(time) {
    orbit.update()

    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement
        camera.aspect = canvas.clientWidth / canvas.clientHeight
        camera.updateProjectionMatrix()
    }

    // Update orbital positions for stars and haze
    galaxy.stars.forEach(star => star.updateOrbit());
    galaxy.haze.forEach(haze => haze.updateOrbit());

    galaxy.group.rotation.z += 0.00005;

    galaxy.updateScale(camera)
    renderPipeline()

    requestAnimationFrame(render)
}

function renderPipeline() {
    camera.layers.set(BLOOM_LAYER)
    bloomComposer.render()

    camera.layers.set(OVERLAY_LAYER)
    overlayComposer.render()

    camera.layers.set(BASE_LAYER)
    baseComposer.render()
}

initThree()
requestAnimationFrame(render)
