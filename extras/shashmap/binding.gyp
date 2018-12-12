{
  "targets": [
    {
      "target_name": "shashmap",
      "cflags_cc": [ '-fexceptions' ],
      "cflags": [ '-fexceptions' ],
      "sources": [ "shashmap.cpp" ],
      'conditions': [
          ['OS=="mac"', {
            'xcode_settings': {
              'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',       # -fno-exceptions
            },
          }
          ]
       ]
    }
  ]
}
