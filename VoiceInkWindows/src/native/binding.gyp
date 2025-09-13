{
  "targets": [
    {
      "target_name": "whisper-binding",
      "sources": [
        "whisper-binding/whisper_wrapper.cpp",
        "whisper-binding/addon.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "../../../whisper.cpp"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "libraries": [
        "../../../whisper.cpp/build/Release/whisper.lib"
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
        }]
      ]
    },
    {
      "target_name": "audio-recorder",
      "sources": [
        "audio-recorder/wasapi_recorder.cpp",
        "audio-recorder/addon.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "libraries": [
        "-lole32.lib",
        "-lwinmm.lib",
        "-lksuser.lib"
      ],
      "conditions": [
        ["OS=='win'", {
          "defines": ["_WIN32_WINNT=0x0600"],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "AdditionalOptions": ["/std:c++17"]
            }
          }
        }]
      ]
    }
  ]
}