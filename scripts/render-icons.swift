// Run from the project root on macOS: swift scripts/render-icons.swift
import AppKit

let source = URL(fileURLWithPath: "docs/icons/mark.svg")
guard let image = NSImage(contentsOf: source) else { fatalError("Cannot read mark.svg") }
for (filename, size, maskable) in [
    ("icon-192.png", 192, false), ("icon-512.png", 512, false),
    ("maskable-512.png", 512, true), ("apple-touch-icon.png", 180, true)
] {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let rect = NSRect(x: 0, y: 0, width: size, height: size)
    if maskable {
        NSColor(srgbRed: 23.0/255, green: 99.0/255, blue: 76.0/255, alpha: 1).setFill()
        rect.fill()
    }
    image.draw(in: rect)
    NSGraphicsContext.restoreGraphicsState()
    try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "docs/icons/\(filename)"))
    print("Created \(filename) (\(size) × \(size))")
}
