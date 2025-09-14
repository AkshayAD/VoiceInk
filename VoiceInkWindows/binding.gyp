{
  "targets": [
    {
      "target_name": "audiorecorder",
      "sources": [
        "src/native/audio-recorder/addon.cpp",
        "src/native/audio-recorder/wasapi_recorder.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "src/native/audio-recorder"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "defines": ["NAPI_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='win'", {
          "defines": ["_HAS_EXCEPTIONS=1", "WIN32_LEAN_AND_MEAN", "NOMINMAX"],
          "libraries": [
            "-lole32",
            "-loleaut32", 
            "-lwinmm",
            "-lksuser",
            "-lpropsys"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/std:c++17", "/permissive-"]
            },
            "VCLinkerTool": {
              "AdditionalDependencies": [
                "ole32.lib",
                "oleaut32.lib",
                "winmm.lib",
                "ksuser.lib",
                "propsys.lib"
              ]
            }
          }
        }],
        ["OS!='win'", {
          "cflags_cc": ["-std=c++17"]
        }]
      ]
    },
    {
      "target_name": "whisperbinding",
      "sources": [
        "src/native/whisper-binding/addon.cpp",
        "src/native/whisper-binding/whisper_transcriber.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "src/native/whisper-binding"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "defines": ["NAPI_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='win'", {
          "defines": ["_HAS_EXCEPTIONS=1"],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/std:c++17"]
            }
          }
        }],
        ["OS!='win'", {
          "cflags_cc": ["-std=c++17"]
        }]
      ]
    }
  ]
}