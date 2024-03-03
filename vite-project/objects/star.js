import * as THREE from 'three'
import { BLOOM_LAYER, STAR_MAX, STAR_MIN } from '../config/renderConfig.js'
import { starTypes } from '../config/starDistributions.js'
import { clamp } from '../utils.js'

const texture = new THREE.TextureLoader().load('../resources/sprite120.png')
const materials = starTypes.color.map((color) => new THREE.SpriteMaterial({map: texture, color: color}))

export class Star {

    constructor(position, isStar) {
        // Use clone to not modify the original
        this.position = position.clone(); 
        this.angle = Math.atan2(position.y, position.x); 
        this.isStar = isStar
        this.starType = this.generateStarType()
        this.obj = null
        this.initialDistance = this.position.length();
    }

    generateStarType() {
        let num = Math.random() * 100.0
        let pct = starTypes.percentage
        for (let i = 0; i < pct.length; i++) {
            num -= pct[i]
            if (num < 0) {
                return i
            }
        }
        return 0
    }

    updateScale(camera) {
        let dist = this.position.distanceTo(camera.position) / 250

        // update star size based on distance and type
        let starSize = dist * starTypes.size[this.starType]
        starSize = clamp(starSize, STAR_MIN, STAR_MAX)
        this.obj?.scale.copy(new THREE.Vector3(starSize, starSize, starSize))
    }

    toThreeObject(group) {
        let sprite = new THREE.Sprite(materials[this.starType]);
        sprite.layers.set(BLOOM_LAYER);
        
        sprite.scale.multiplyScalar(starTypes.size[this.starType]);
        sprite.position.copy(this.position);
    
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
