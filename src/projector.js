import { ProjectionEffect } from './projection-effect'
import { ScreenImage } from './screen-image'
import * as U from './utils'

export class Projector {

  constructor(projectorPosition, orientation, projectorForm, screenForm, scene, hazeTexture) {
    const shapeCount = screenForm.shapeCount
    this.projectorForm = projectorForm
    this.screenForm = screenForm
    this.screenImage = new ScreenImage(orientation, shapeCount, scene)
    this.projectionEffect = new ProjectionEffect(projectorPosition, orientation, shapeCount, scene, hazeTexture)
  }

  update() {
    const projectorShapes = this.projectorForm.getUpdatedPoints().map(U.reverse)
    const screenShapes = this.screenForm.getUpdatedPoints().map(U.reverse)
    this.screenImage.update(screenShapes)
    this.projectionEffect.update(projectorShapes, screenShapes)
  }

  destroy() {
    this.screenImage.destroy()
    this.projectionEffect.destroy()
  }

  toggleVertexNormals() {
    this.projectionEffect.toggleVertexNormals()
  }
}