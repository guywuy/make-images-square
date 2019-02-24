importScripts("lib/jimp.min.js");

if (!self.Jimp && !window.Jimp) {
    throw new Error("Could not load jimp.min.js in jimp-worker.js");
}

// Do some image processing in Jimp. Syntax exactly the same as
// https://github.com/oliver-moran/jimp
// Reading and writing functions are replaced for browser context.
// See readme at https://github.com/strandedcity/jimp
self.addEventListener('message', function(e) {
    // Some browsers allow passing of file objects directly from inputs, which would
    // enable doing the file I/O on the worker thread. Browser support is patchy however,
    // so the most compatible strategy is to read the file on the main thread asynchronously,
    // then pass the data here. File I/O is asynchronous on the main thread, and represents
    // a generally small part of the total image-processing task.
    //
    // See https://developer.mozilla.org/en-US/docs/Web/API/Transferable for support of transferables
    // Note that passing an array of Transferables makes the worker incompatible with IE10.

    Jimp.read(e.data).then(function(image){
        
        var originalMime = image._originalMime,
            targetMimeType = originalMime || Jimp.MIME_JPEG;

            let largestLength = image.bitmap.width > image.bitmap.height ? image.bitmap.width : image.bitmap.width;

            console.log(targetMimeType);

            image.background(0xFFFFFFFF)
            .contain(largestLength, largestLength)            // resize
            .quality(80)                 // set JPEG quality
            .getBuffer(targetMimeType,function(mime, data){
                // With access to node's Buffer objects, it's easy to get a base64 string:
                var dataUri = "data:" + targetMimeType + ";base64,"  + data.toString('base64');

                // Return data uri to the main thread.
                // Data URIs can be displayed in <img> tags, without <canvas>
                self.postMessage({
                    type: "DATA_URI",
                    data: dataUri,
                    width: image.bitmap.width,
                    height: image.bitmap.height
                });

                // Good idea to close the worker when you're done
                self.close();

                   
            });
    }).catch(function(err){
        // Prevent the error from getting swallowed in the promise
        setTimeout(function() { throw err; },0);
    });

}, false);



// If simple image.contain doesn't produce letterbox whitespace, may have to create new image with square dimensions and composite