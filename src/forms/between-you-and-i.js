import * as THREE from 'three'
import { Ellipse } from '../syntax/ellipse'
import * as U from '../utils'
import * as C from '../constants'

const ELLIPSE_POINT_COUNT = 100
const TRAVELLING_WAVE_POINT_COUNT = 100
const RX = 1.5
const RY = 2
const MAX_TICKS = 10000

export class BetweenYouAndIForm {

  constructor(projectorPosition, isProjector, isFront, distance) {
    this.vec2ProjectorPosition = new THREE.Vector2(projectorPosition.x, projectorPosition.z)
    this.isProjector = isProjector
    this.isFront = isFront
    this.distance = distance
    this.reset(isFront)
  }

  get shapeCount() {
    return 3
  }

  getEllipsePoints(wipeExtent) {
    if (this.isProjector) {
      return U.repeat(ELLIPSE_POINT_COUNT + 1, this.vec2ProjectorPosition)
    }

    // TODO: currently, each tick moves by the same delta y distance.
    // This gives the appearance of speeding up as the arc get smaller.
    // It would be nice to be linear in delta angle rather than delta y.
    const y = RY - wipeExtent
    const theta = Math.acos(y / RY)

    const startAngle = this.wipingInEllipse
      ? C.HALF_PI + theta
      : C.HALF_PI - theta

    const endAngle = this.wipingInEllipse
      ? C.HALF_PI - theta
      : C.HALF_PI - (C.TWO_PI - theta)

    const rx = RX - (1 * Math.sin(C.PI * this.tick / MAX_TICKS))

    const ellipse = new Ellipse(0, this.distance, rx, RY)
    return ellipse.getPoints(startAngle, endAngle, ELLIPSE_POINT_COUNT)
  }

  getTravellingWavePoints(wipeExtent) {
    if (this.isProjector) {
      return U.repeat(TRAVELLING_WAVE_POINT_COUNT + 1, this.vec2ProjectorPosition)
    }

    // y(x,t) = A sin(kx - ωt + φ)
    // Here k is the wave number, k = 2π/λ,
    // and ω = 2π/T = 2πf is the angular frequency of the wave.
    // φ is called the phase constant.

    if (this.wipingInEllipse) {
      const dy = (2 * RY - wipeExtent) / TRAVELLING_WAVE_POINT_COUNT
      const lambda = 2 * RY
      const k = C.TWO_PI / lambda
      const f = 2
      const omega = C.TWO_PI * f
      const t = this.tick / MAX_TICKS
      return U.range(TRAVELLING_WAVE_POINT_COUNT + 1).map(n => {
        const y = n * dy
        const x = RX * Math.sin(k * y + omega * t)
        return new THREE.Vector2(x, this.distance + RY - wipeExtent - y)
      })
    } else {
      const dy = wipeExtent / TRAVELLING_WAVE_POINT_COUNT
      const lambda = 2 * RY
      const k = C.TWO_PI / lambda
      const f = 2
      const omega = C.TWO_PI * f
      const t = this.tick / MAX_TICKS
      return U.range(TRAVELLING_WAVE_POINT_COUNT + 1).map(n => {
        const y = n * dy
        const x = RX * Math.sin(k * y + omega * t)
        return new THREE.Vector2(x, this.distance + RY - y)
      })
    }
  }

  getStraightLinePoints(wipeExtent) {
    if (this.isProjector) {
      return U.repeat(2, this.vec2ProjectorPosition)
    }

    const cx = 0
    const cy = this.distance
    const theta = -C.QUARTER_PI + (C.PI * this.tick / MAX_TICKS)
    const thresholdY = this.distance + RY - wipeExtent
    const f = this.wipingInEllipse ? Math.min : Math.max
    const p1y = f(cy + RY * Math.sin(theta), thresholdY)
    const p2y = f(cy - RY * Math.sin(theta), thresholdY)
    const p1x = cx + ((p1y - cy) / Math.tan(theta))
    const p2x = cx - ((cy - p2y) / Math.tan(theta))
    return [
      new THREE.Vector2(p1x, p1y),
      new THREE.Vector2(p2x, p2y)
    ]
  }

  getUpdatedPoints() {
    const min = this.distance - RY
    const max = this.distance + RY
    const wipeExtent = (max - min) * this.tick / MAX_TICKS
    const points = [
      this.getEllipsePoints(wipeExtent),
      this.getTravellingWavePoints(wipeExtent),
      this.getStraightLinePoints(wipeExtent)
    ]
    this.tick++
    if (this.tick > MAX_TICKS) {
      this.reset(!this.wipingInEllipse)
    }
    return points
  }

  reset(wipingInEllipse) {
    this.tick = 0
    this.wipingInEllipse = wipingInEllipse
  }
}
