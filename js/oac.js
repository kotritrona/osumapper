
            setTimeout(function() {
                print("fetch start...");
                fetch("Rakuen PROJECT.ogg", {
                    responseType: "arrayBuffer"
                }).then(z => z.arrayBuffer()).then(z => {
                    var auc = new AudioContext();
                    auc.decodeAudioData(z).then(g);
                    print("fetch OK, decode start...");
                })
            }, 100);
      function g(r) {
                var cdata = r.getChannelData(0);
                var newData = cdata.slice(r.sampleRate * 70, r.sampleRate * 72);
                print("decode end, OAC start...");

                var oac = new OfflineAudioContext({numberOfChannels: 1, length: newData.length, sampleRate: r.sampleRate});
                var buff = oac.createBuffer(1, newData.length, r.sampleRate);
                print("buffer create end...");

                buff.copyToChannel(newData, 0);
                print("copy_channel end...");

                var source = oac.createBufferSource();
                source.buffer = buff;

                var analyser = oac.createAnalyser();
                analyser.fftSize = 64;
                source.connect(analyser);
                print("analyser_connect end...");

                source.start();
                print("OAC render start...");
                oac.startRendering().then(result => {
                    var dataArray = new Float32Array(analyser.frequencyBinCount);
                    analyser.getFloatFrequencyData(dataArray);
                    print(dataArray);
                    window.da = dataArray;
                    print("OAC render end");
                });

      }