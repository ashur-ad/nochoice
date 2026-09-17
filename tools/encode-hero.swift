// Hero-loop encoder built on AVFoundation, because avconvert's presets pick their
// own (very high) bitrate. This sets resolution, bitrate and keyframes directly,
// drops the audio track (a background video is muted anyway), and writes the
// index at the front of the file so the browser can start playing immediately.
//
// usage: swift encode.swift SRC OUT START_SEC DURATION_SEC WIDTH HEIGHT BITRATE_BPS
import AVFoundation
import Foundation

let a = CommandLine.arguments
guard a.count == 8 else { print("usage: SRC OUT START DUR W H BPS"); exit(2) }
let src = URL(fileURLWithPath: a[1]), out = URL(fileURLWithPath: a[2])
let start = Double(a[3])!, dur = Double(a[4])!
let w = Int(a[5])!, h = Int(a[6])!, bps = Int(a[7])!

try? FileManager.default.removeItem(at: out)
let asset = AVURLAsset(url: src)
guard let track = asset.tracks(withMediaType: .video).first else { print("no video track"); exit(1) }
let fps = track.nominalFrameRate > 0 ? track.nominalFrameRate : 30

let reader = try AVAssetReader(asset: asset)
reader.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600),
                               duration: CMTime(seconds: dur, preferredTimescale: 600))
// Decode at native size and let the writer do the scaling/cropping, so a
// portrait target centre-crops the 16:9 frame instead of squashing it.
let rOut = AVAssetReaderTrackOutput(track: track, outputSettings: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange
])
rOut.alwaysCopiesSampleData = false
reader.add(rOut)

let writer = try AVAssetWriter(outputURL: out, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true              // moov atom first = fast start
let wIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,                // H.264: plays in every browser
  AVVideoWidthKey: w,
  AVVideoHeightKey: h,
  AVVideoScalingModeKey: AVVideoScalingModeResizeAspectFill,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: bps,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    AVVideoAllowFrameReorderingKey: true,
    AVVideoExpectedSourceFrameRateKey: Int(fps.rounded()),
    AVVideoMaxKeyFrameIntervalKey: Int(fps.rounded())   // a keyframe every second
  ]
])
wIn.expectsMediaDataInRealTime = false
wIn.transform = track.preferredTransform
writer.add(wIn)

guard reader.startReading(), writer.startWriting() else {
  print("start failed:", reader.error ?? writer.error ?? "unknown"); exit(1)
}
var sessionStarted = false
var frames = 0
let done = DispatchSemaphore(value: 0)
wIn.requestMediaDataWhenReady(on: DispatchQueue(label: "enc")) {
  while wIn.isReadyForMoreMediaData {
    guard let sb = rOut.copyNextSampleBuffer() else {
      wIn.markAsFinished(); done.signal(); return
    }
    if !sessionStarted {                                   // the clip's timeline begins at 0
      writer.startSession(atSourceTime: CMSampleBufferGetPresentationTimeStamp(sb))
      sessionStarted = true
    }
    if !wIn.append(sb) { print("append failed:", writer.error ?? "?"); wIn.markAsFinished(); done.signal(); return }
    frames += 1
  }
}
done.wait()
let fin = DispatchSemaphore(value: 0)
writer.finishWriting { fin.signal() }
fin.wait()
if writer.status != .completed { print("write failed:", writer.error ?? "?"); exit(1) }
let size = (try? FileManager.default.attributesOfItem(atPath: out.path)[.size] as? Int) ?? 0
print(String(format: "ok  %d frames @ %.0ffps  %dx%d  %.1f Mbps  %.1f MB", frames, fps, w, h, Double(bps)/1e6, Double(size)/1e6))
