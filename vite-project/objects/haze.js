import { BASE_LAYER, HAZE_MAX, HAZE_MIN, HAZE_OPACITY } from "../config/renderConfig.js"
import { clamp } from "../utils.js"
import * as THREE from 'three'


const hazeTexture = new THREE.TextureLoader().load('../resources/feathered60.png')
const hazeSprite = new THREE.SpriteMaterial({map: hazeTexture, color: 0x0082ff, opacity: HAZE_OPACITY, depthTest: false, depthWrite: false })

export class Haze {

    constructor(position, isHaze) {
        // Use clone to not modify the original
        this.position = position.clone();
        this.angle = Math.atan2(position.y, position.x); 
        this.isHaze = isHaze
        this.obj = null
        this.initialDistance = this.position.length();
    }

    updateScale(camera) {
        let dist = this.position.distanceTo(camera.position) / 250
        this.obj.material.opacity = clamp(HAZE_OPACITY * Math.pow(dist / 2.5, 2), 0, HAZE_OPACITY)
        this.obj.material.needsUpdate = true
    }

    toThreeObject(group) {
        let sprite = new THREE.Sprite(hazeSprite);
        sprite.layers.set(BASE_LAYER);
        sprite.position.copy(this.position);
        sprite.scale.multiplyScalar(clamp(HAZE_MAX * Math.random(), HAZE_MIN, HAZE_MAX));
    
        this.obj = sprite;
    
        group.add(sprite);
    }

    updateOrbit() {
        // Calculate the angular speed based on the initial distance (slower for stars further out)
        let angularSpeed = 0.08 / this.initialDistance;

        // Increment the angle for rotation
        this.angle += angularSpeed;

        // Calculate the new position using polar coordinates
        this.position.x = Math.cos(this.angle) * this.initialDistance;
        this.position.y = Math.sin(this.angle) * this.initialDistance;

        // Update the object's position to simulate rotation
        this.obj.position.set(this.position.x, this.position.y, this.position.z);
    }
}
