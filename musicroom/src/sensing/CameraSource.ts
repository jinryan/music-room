export class CameraSource {
  private video: HTMLVideoElement
  private inputCanvas: HTMLCanvasElement
  private inputContext: CanvasRenderingContext2D | null = null

  constructor(video: HTMLVideoElement) {
    this.video = video
    this.inputCanvas = document.createElement('canvas')
  }

  async init() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    })

    this.video.srcObject = stream
    await this.video.play()
  }

  getVideo() {
    return this.video
  }

  captureMirroredFrame(): HTMLCanvasElement | null {
    const width = this.video.videoWidth
    const height = this.video.videoHeight

    if (!width || !height) {
      return null
    }

    this.ensureCanvas(width, height)
    if (!this.inputContext) {
      return null
    }

    this.inputContext.save()
    this.inputContext.translate(width, 0)
    this.inputContext.scale(-1, 1)
    this.inputContext.drawImage(this.video, 0, 0, width, height)
    this.inputContext.restore()

    return this.inputCanvas
  }

  private ensureCanvas(width: number, height: number) {
    if (this.inputCanvas.width === width && this.inputCanvas.height === height) {
      return
    }

    this.inputCanvas.width = width
    this.inputCanvas.height = height
    this.inputContext = this.inputCanvas.getContext('2d')
  }
}
