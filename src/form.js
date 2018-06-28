import * as THREE from "three";
import LineInitFn from "three-line-2d";
import BasicShaderInitFn from "three-line-2d/shaders/basic";
const Line = LineInitFn(THREE);
const BasicShader = BasicShaderInitFn(THREE);
import { MembraneBufferGeometry } from "./MembraneGeometry";
import * as C from "./constants";

const PROJECTED_IMAGE_RADIUS_X = 2.8;
const PROJECTED_IMAGE_RADIUS_Y = 2;
const PROJECTED_IMAGE_LINE_THICKNESS = 0.08;
const PROJECTOR_BULB_RADIUS = 0.08;
const ELLIPSE_POINT_COUNT = 100;
const WIPE_POINT_COUNT = 50;
const MEMBRANE_SEGMENT_COUNT = 1;
const ROTATION_DELTA = Math.PI / (180 * 1);
const SWAP_AT_TICK = Math.floor(2 * Math.PI / ROTATION_DELTA);
const DELTA_ANGLE = 15 * Math.PI / 180;
const ANGLE_OFFSET_THRESHOLD = 45 * Math.PI / 180;

const lineMaterialQ = new THREE.ShaderMaterial(
  BasicShader({
    side: THREE.DoubleSide,
    diffuse: 0xffffff,
    thickness: PROJECTED_IMAGE_LINE_THICKNESS
  }));

const reverseNormals = bufferGeometry => {
  const normalAttribute = bufferGeometry.getAttribute("normal");
  const array = normalAttribute.array;
  for (let i = 0; i < array.length; i++) {
    array[i] *= -1;
  }
};

const toArr2Points = pointsVec2 =>
  pointsVec2.map(vec2 => vec2.toArray());

const toVec3Points = (pointsVec2, z) =>
  pointsVec2.map(vec2 => new THREE.Vector3(vec2.x, vec2.y, z));

export const swapSidesTest = tick =>
  tick === SWAP_AT_TICK;

class Form {

  constructor(scene, initialSide) {
    this.scene = scene;
    this.initialSide = initialSide;
    this.init();
  }

  init() {
    this.ellipseCurveP = new THREE.EllipseCurve(
      this.initialSide === C.LEFT ? C.LEFT_CENTRE_X : C.RIGHT_CENTRE_X,
      C.CENTRE_P_Y,
      PROJECTOR_BULB_RADIUS,
      PROJECTOR_BULB_RADIUS,
      this.getStartAngle(),
      this.getEndAngle(),
      this.getIsClockwise());

    this.ellipseCurveQ = new THREE.EllipseCurve(
      this.initialSide === C.LEFT ? C.LEFT_CENTRE_X : C.RIGHT_CENTRE_X,
      C.CENTRE_Q_Y,
      PROJECTED_IMAGE_RADIUS_X,
      PROJECTED_IMAGE_RADIUS_Y,
      this.getStartAngle(),
      this.getEndAngle(),
      this.getIsClockwise());

    this.wipeCurveP = new THREE.CubicBezierCurve();
    this.wipeCurveQ = new THREE.CubicBezierCurve();

    this.lineGeometryQ = Line();
    this.lineMeshQ = new THREE.Mesh(this.lineGeometryQ, lineMaterialQ);
    this.scene.add(this.lineMeshQ);

    this.membraneGeometryInner = new MembraneBufferGeometry();
    this.membraneGeometryOuter = new MembraneBufferGeometry();

    this.membraneMaterialInner = undefined;
    this.membraneMaterialOuter = undefined;

    this.membraneMeshInner = undefined;
    this.membraneMeshOuter = undefined;

    this.membraneMeshInnerHelper = undefined;
    this.membraneMeshOuterHelper = undefined;
  }

  onTextureLoaded(texture) {

    this.membraneMaterialInner = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.FrontSide,
      color: 0xffffff,
      transparent: true,
      opacity: 0.4
    });

    this.membraneMaterialOuter = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      color: 0xffffff,
      transparent: true,
      opacity: 0.4
    });

    this.membraneMeshInner = new THREE.Mesh(
      this.membraneGeometryInner,
      this.membraneMaterialInner);

    this.membraneMeshOuter = new THREE.Mesh(
      this.membraneGeometryOuter,
      this.membraneMaterialOuter);

    this.scene.add(this.membraneMeshInner);
    this.scene.add(this.membraneMeshOuter);
  }

  getStartAngle() {
    throw new Error("You have to implement the method getStartAngle!");
  }

  getEndAngle() {
    throw new Error("You have to implement the method getEndAngle!");
  }

  getIsClockwise() {
    throw new Error("You have to implement the method getIsClockwise!");
  }

  getCurrentAngle(tick) {
    return this.getStartAngle() - (ROTATION_DELTA * tick);
  }

  combineEllipseAndWipe(ellipsePoints, wipePoints) {
    return ellipsePoints.slice().reverse().concat(wipePoints.slice(1));
  }

  getWipePoints(e, w, currentAngle, deltaAngle1, deltaAngle2, alpha) {

    const calculateEllipsePoint = theta => new THREE.Vector2(
      e.aX + e.xRadius * Math.cos(theta),
      e.aY + e.yRadius * Math.sin(theta));

    const centrePoint = new THREE.Vector2(e.aX, e.aY);
    const deltaPoint1 = calculateEllipsePoint(deltaAngle1);
    const deltaPoint2 = calculateEllipsePoint(deltaAngle2);

    const startingPoint = calculateEllipsePoint(currentAngle);
    const endingPoint = startingPoint.clone().lerp(centrePoint, alpha);
    const controlPoint1 = deltaPoint1.lerp(endingPoint, 0.25);
    const controlPoint2 = deltaPoint2.lerp(endingPoint, 0.75);

    w.v0.copy(startingPoint);
    w.v1.copy(controlPoint1);
    w.v2.copy(controlPoint2);
    w.v3.copy(endingPoint);

    return w.getPoints(WIPE_POINT_COUNT);
  }

  updatePoints(tick) {

    const startAngle = this.getStartAngle();
    const currentAngle = this.getCurrentAngle(tick);
    this.ellipseCurveP.aStartAngle = currentAngle;
    this.ellipseCurveQ.aStartAngle = currentAngle;
    const angleOffset = Math.abs(currentAngle - startAngle);
    const angleOffset2 = angleOffset < Math.PI ? angleOffset : 2 * Math.PI - angleOffset;
    const normalisingFactor = 1 / ANGLE_OFFSET_THRESHOLD;
    const alpha = angleOffset2 > ANGLE_OFFSET_THRESHOLD ? 1.0 : (angleOffset2 * normalisingFactor);
    const deltaAngle1 = currentAngle + DELTA_ANGLE * alpha;
    const deltaAngle2 = currentAngle - DELTA_ANGLE * alpha;

    const psEllipseVec2 = this.ellipseCurveP.getPoints(ELLIPSE_POINT_COUNT);
    const qsEllipseVec2 = this.ellipseCurveQ.getPoints(ELLIPSE_POINT_COUNT);

    let psWipeVec2 = this.getWipePoints(
      this.ellipseCurveP,
      this.wipeCurveP,
      currentAngle,
      deltaAngle1,
      deltaAngle2,
      alpha);

    let qsWipeVec2 = this.getWipePoints(
      this.ellipseCurveQ,
      this.wipeCurveQ,
      currentAngle,
      deltaAngle1,
      deltaAngle2,
      alpha);

    const psCombinedVec2 = this.combineEllipseAndWipe(psEllipseVec2, psWipeVec2);
    const qsCombinedVec2 = this.combineEllipseAndWipe(qsEllipseVec2, qsWipeVec2);

    return {
      psVec2: psCombinedVec2,
      qsVec2: qsCombinedVec2
    };
  }

  updateProjectedImage({ qsVec2 }) {
    this.lineGeometryQ.update(toArr2Points(qsVec2));
  }

  updateMembrane({ psVec2, qsVec2 }) {

    const psVec3 = toVec3Points(psVec2, C.MEMBRANE_LENGTH);
    const qsVec3 = toVec3Points(qsVec2, 0);

    const tempMembraneGeometry = new MembraneBufferGeometry(psVec3, qsVec3, MEMBRANE_SEGMENT_COUNT);
    tempMembraneGeometry.computeVertexNormals(); // NOT NEEDED ?
    this.membraneGeometryInner.copy(tempMembraneGeometry);
    reverseNormals(tempMembraneGeometry); // NOT NEEDED ?
    this.membraneGeometryOuter.copy(tempMembraneGeometry);
    tempMembraneGeometry.dispose();

    if (this.membraneMeshInnerHelper) {
      this.membraneMeshInnerHelper.update();
      this.membraneMeshOuterHelper.update();
    }
  }

  update(tick) {
    const updatedPoints = this.updatePoints(tick);
    this.updateProjectedImage(updatedPoints);
    this.updateMembrane(updatedPoints);
  }

  swapSides() {
    this.ellipseCurveP.aX = this.ellipseCurveP.aX === C.RIGHT_CENTRE_X ? C.LEFT_CENTRE_X : C.RIGHT_CENTRE_X;
    this.ellipseCurveQ.aX = this.ellipseCurveQ.aX === C.RIGHT_CENTRE_X ? C.LEFT_CENTRE_X : C.RIGHT_CENTRE_X;
    this.ellipseCurveP.aStartAngle = this.getStartAngle();
    this.ellipseCurveQ.aStartAngle = this.getStartAngle();
  }

  toggleHelpers() {
    if (this.membraneMeshInnerHelper) {
      this.scene.remove(this.membraneMeshInnerHelper);
      this.scene.remove(this.membraneMeshOuterHelper);
      this.membraneMeshInnerHelper = undefined;
      this.membraneMeshOuterHelper = undefined;
    }
    else {
      this.membraneMeshInnerHelper = new THREE.VertexNormalsHelper(this.membraneMeshInner, 0.1, 0x00ff00);
      this.membraneMeshOuterHelper = new THREE.VertexNormalsHelper(this.membraneMeshOuter, 0.1, 0x0000ff);
      this.scene.add(this.membraneMeshInnerHelper);
      this.scene.add(this.membraneMeshOuterHelper);
    }
  }
}

export class GrowingForm extends Form {

  constructor(scene, initialSide) {
    super(scene, initialSide);
  }

  getStartAngle() {
    return 1.5 * Math.PI;
  }

  getEndAngle() {
    return -0.5 * Math.PI;
  }

  getIsClockwise() {
    return false;
  }
}

export class ShrinkingForm extends Form {

  constructor(scene, initialSide) {
    super(scene, initialSide);
  }

  getStartAngle() {
    return 1.5 * Math.PI;
  }

  getEndAngle() {
    return 3.5 * Math.PI;
  }

  getIsClockwise() {
    return true;
  }
}
