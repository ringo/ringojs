var httpConf = {
  staticDir: 'static'
}

var urls =[
    [ /^$/, 'main.index' ],
    [ /^skins$/, 'main.skins' ],
    [ /^mount\/point/, 'webmodule.index' ],
    [ /^continuation/, 'main.continuation' ],
    [ /^logging/, 'main.logging' ], 
]
