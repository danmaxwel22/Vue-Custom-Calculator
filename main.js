const debounce = (func, wait, immediate) => {
	var timeout
	return function() {
		var context = this, args = arguments
		var later = function() {
			timeout = null
			if (!immediate) func.apply(context, args)
		}
		var callNow = immediate && !timeout
		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
		if (callNow) func.apply(context, args)
	}
}
new Vue({
    el: '#calculator',
    data: {
        memoryArea: '',
        inputAreaFS: 23,
        operationArea: '',
        cachingArea: '',
        inputArea: '',
        stagingArea: '',
        arithmeticOperators: ["/", "+", "-", "%", "*"],
        stringOperators: ["÷", "+", "−", "%", "*"],
        stagingAreaArr: [],
        backupStageAreaArr: [],
        historyLog: [],
    },
    methods: {
        generateELE: function(id, val) {
            switch(id) {
                case 'stg_DG':
                    return "<span class='t_digits'>"+val+"</span>"
                case 'stg_OP':
                    const classList = ['_div', '_add', '_sub', '_perc', '_mul', '_equal']
                    const index = this.stringOperators.indexOf(val)
                    return "<span class='t_operators "+classList[index]+"'>"+val+"</span>"
                default:
                    break;
            }
        },

        numberWithCommas: function(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },

        formatScientific: function(num) {
            num = +num
            if(this.toLocaleStringSupportsOptions()) {
                return new Intl.NumberFormat(undefined, { 
                    notation: "scientific"
                }).format(num);
            }
            return num.toExponential(3).replace("e+", "E")
        },

        toLocaleStringSupportsOptions: function() {
            return !!(typeof Intl == 'object' && Intl && typeof Intl.NumberFormat == 'function');
        },

        checkLengthInput: function(length) {
            const vm = this
            if(length == 15) return vm.inputAreaFS -= 1.8
            if(length == 14) return vm.inputAreaFS -= 1.6
            if(length == 13) return vm.inputAreaFS -= 1.4
        },

        revertSign: debounce(function() {
            const vm = this
            var ia = vm.inputArea
            var ca
            if(ia == '') return
            if(ia.indexOf("-") > -1) {
                vm.cachingArea = vm.cachingArea.replace(/[()\\s-]+/g, "")
                vm.inputArea = ia.replace("-", "")
                console.log(vm.cachingArea)
                return
            }
            vm.cachingArea = String("(" + +vm.cachingArea * -1 + ")")
            vm.inputArea = "-" + vm.inputArea
            console.log(vm.cachingArea)
        }, 100),

        getSquareRoot: debounce(function() {
            const vm = this
            var ca = Math.sqrt(vm.cachingArea)
            var ia = vm.generateELE( "stg_DG", "&#8730(" + vm.inputArea + ")" )

            if(!vm.cachingArea || vm.cachingArea <= 0) return
            if(vm.historyLog[vm.historyLog.length - 1] == "square-root") return
            if(isNaN(ca)) return
            vm.stagingAreaArr.push(ia)
            vm.backupStageAreaArr.push(ca)
            vm.stagingArea = vm.stagingAreaArr.join("")
            vm.operationArea = vm.operationArea + ca
            vm.inputArea = 0
            vm.cachingArea = ''
            vm.historyLog.push("square-root")
        }, 100),

        insertDIG: debounce(function(val) {
            val = String(val)
            const vm = this
            var currDigits = vm.cachingArea
            const len = currDigits.length
            const currChar = currDigits.substr(len - 1)

            if(val == 0 && 0 == vm.inputArea) return
            if(vm.historyLog[vm.historyLog.length - 1] == "square-root") return
            if((val == '.' && currDigits.indexOf('.') > -1) || len > 15) return
            vm.checkLengthInput(len)
            if(vm.stringOperators.indexOf(String(currChar)) > -1) currDigits = ''
            var ca = currDigits + val
            vm.cachingArea = ca
            currDigits = vm.numberWithCommas(ca)
            vm.inputArea = currDigits

            vm.historyLog.push("insert-on-field")
        }, 100),

        insertOPE: debounce(function( val ) {
            val = String( val )
            const vm = this
            var currDigits = vm.operationArea
            const opEL = vm.generateELE( 'stg_OP', val )
            const last = vm.stagingAreaArr[vm.stagingAreaArr.length - 1]
            const index = vm.stringOperators.indexOf( val )

            vm.inputAreaFS = 23
            if(vm.cachingArea == '' && vm.stagingArea == '') return
            if(last == opEL && vm.inputArea == 0) return
            if(last == vm.generateELE( 'stg_OP', vm.stringOperators[3] )) {
                const len = vm.operationArea.length - 2
                var findIndex = ''
                var area = ''
                var i

                for(i = len; i >= 0; i--) {
                    if(vm.arithmeticOperators.indexOf(vm.operationArea.charAt(i)) > -1) {
                        findIndex = i
                        break
                    }
                }
                if(findIndex) {
                    var num = 0
                    for(i = findIndex; i < vm.operationArea.length - 1; i++) {
                        if(i > findIndex)
                            num = num + vm.operationArea.charAt(i) 
                    }
                    num = +(num / 100)
                    area = vm.operationArea.slice(0, findIndex + 1)
                    area = area + num
                } else {
                    area = vm.operationArea.slice(0, -1)
                    area = +(area / 100)
                }
                vm.operationArea = area + vm.arithmeticOperators[index]
                vm.backupStageAreaArr.push( val )
                vm.stagingAreaArr.push(opEL)
            } else if( index > -1 && vm.inputArea == 0 ) {
                if(vm.historyLog[vm.historyLog.length - 1] == "square-root") {
                    vm.stagingAreaArr.push( opEL )
                    vm.backupStageAreaArr.push( val )
                    vm.operationArea = currDigits + vm.arithmeticOperators[index]
                } else {
                    vm.stagingAreaArr.pop()
                    vm.stagingAreaArr.push( opEL )
                    vm.backupStageAreaArr.pop()
                    vm.backupStageAreaArr.push( val )
                    vm.stagingArea.slice(0, -1)
                    vm.operationArea = currDigits.slice(0, -1) + vm.arithmeticOperators[index]
                }
            } else {
                var ca = vm.cachingArea 
                if(String(ca).length > 10)
                    ca = vm.formatScientific( ca )
                else
                    ca = vm.numberWithCommas( ca )
                vm.backupStageAreaArr.push( ca , val )
                ca = vm.generateELE( 'stg_DG', ca )
                vm.stagingAreaArr.push( ca , opEL )
                vm.operationArea = currDigits + vm.cachingArea + vm.arithmeticOperators[index]
            }

            var startStr = ""
            
            if(vm.backupStageAreaArr.join("").length > 19) {
                const bsLen = vm.backupStageAreaArr.length - 1
                var str = ''
                var trimChar = vm.backupStageAreaArr.join("").length - 19

                for(i = 0; i <= bsLen; i++) { 
                    str = String(vm.backupStageAreaArr[i])

                    if(str.length >= trimChar) {
                        str = str.substr(trimChar)
                        startStr = str

                        if(i % 2 == 0) {
                            if(String(startStr).slice(1) == ",")
                                str = str.slice(1)
                            vm.stagingAreaArr[i] = vm.generateELE( 'stg_DG', str )
                        } else {
                            vm.stagingAreaArr[i] = vm.generateELE( 'stg_OP', str )
                        }
                        vm.backupStageAreaArr[i] = str
                        break
                    } else {
                        vm.stagingAreaArr[i] = ""
                        vm.backupStageAreaArr[i] = ""
                    }
                    trimChar = trimChar - str.length
                }
                
                startStr = "<span class='t_operators'><< </span>"
            }
            
            vm.stagingArea = startStr + vm.stagingAreaArr.join("")
            vm.cachingArea = ''
            vm.inputArea = 0
            vm.historyLog.push("insert-on-stage")
        }, 100), 

        computeALL: debounce(function() {
            const vm = this
            var oa = vm.operationArea
            vm.inputAreaFS = 23
            
            if(oa != '') {
                var compute
                const ia = vm.inputArea
                var cia = ia
                var isNegative = String(ia).indexOf("-") > -1 ? true : false
                if(String(ia).indexOf(",") > -1) {
                    cia = parseFloat(ia.replace(/,/g, ''))
                }
                cia = isNegative ? "(" + cia + ")" : cia
                compute = eval(oa + cia)
                if(vm.historyLog[vm.historyLog.length - 1] == "square-root" && vm.cachingArea == '') {
                    vm.stagingArea = vm.stagingArea + "<span class='t_operators'> = </span>"
                } else if(vm.backupStageAreaArr[vm.backupStageAreaArr.length - 1] == "%" && vm.cachingArea == '') {
                    vm.stagingArea = vm.stagingArea + "<span class='t_operators'> = </span>"
                    compute = +(vm.operationArea.slice(0, -1)) / 100
                } else {
                    vm.stagingArea = vm.stagingArea + vm.generateELE( 'stg_DG', cia) + "<span class='t_operators'> = </span>"
                }
                vm.operationArea = ''
                vm.stagingAreaArr = []
                vm.backupStageAreaArr = []
                vm.cachingArea = compute
                var len = String(compute).length
                
                if(len > 15) {
                    vm.inputArea = vm.formatScientific(compute)
                } else {
                    vm.checkLengthInput(len)
                    vm.inputArea = vm.numberWithCommas(compute)
                }
                vm.historyLog.push("compute-operation")
            }
        }, 100),

        clearStages: debounce(function() {
            const vm = this
            const isDone = vm.historyLog[vm.historyLog.length - 1]
            vm.inputAreaFS = 23
            if(vm.inputArea == 0 && isDone != 'compute-operation') {
                vm.operationArea = ''
                vm.stagingArea = ''
                vm.stagingAreaArr = []
                vm.backupStageAreaArr = []
                vm.inputArea = ''
            } else {
                if(isDone == 'compute-operation')
                    vm.stagingArea = "<span class='t_operators'>ANS = </span>" + vm.generateELE( 'stg_DG', vm.inputArea )
                vm.inputArea = 0
            }
            vm.cachingArea = ''
            vm.historyLog.push("clear-on-areas")
        }, 100),

        clearMemory: debounce(function() {
            this.memoryArea = ''
        }, 100),

        useMemory: debounce(function() {
            const vm = this
            var mem = vm.memoryArea
            const len = vm.numberWithCommas(mem).length
            
            if(!mem) return
            if(len > 15) {
                mem = vm.formatScientific(mem)
            } else {
                vm.checkLengthInput(len)
                mem = vm.numberWithCommas(mem)
            }
            vm.inputArea = mem
            vm.cachingArea = mem
        }, 100),

        addToMemory: debounce(function() {
            const vm = this
            vm.memoryArea = +vm.memoryArea + +vm.cachingArea
        }, 100),

        subtractToMemory: debounce(function() {
            const vm = this
            vm.memoryArea = +vm.memoryArea - +vm.cachingArea
        }, 100),

    }
})
