define(["map", "eventing"], function (map, eventing) {
    "use strict";

    var $ = window.$;
    var console = window.console;

    var deltaSet = function (list1, list2, comparator, update) {

        if (!comparator) {
            comparator = function (o1, o2) {
                return o1 === o2;
            };
        }

        if (!update) {
            update = function (o) {

            };
        }

        var pos = function (list, startIndex, element) {
            for (var i = startIndex; i < list.length; ++i) {
                if (comparator(element, list[i])) {
                    return i;
                }
            }
            return -1;
        };

        var find = function (list1, i1, list2, i2) {
            for (var n1 = i1; n1 < list1.length; ++n1) {
                var n2 = pos(list2, i2 + 1, list1[n1]);
                if (n2 > 0) {
                    return {
                        i1: n1,
                        i2: n2
                    };
                }
            }
            return {
                i1: list1.length,
                i2: list2.length
            };
        };

        for (var i1 = 0, i2 = 0; i1 < list1.length || i2 < list2.length;) {
            var e1 = list1[i1];
            var e2 = list2[i2];
            if (e1 && e2 && comparator(e1, e2)) {
                update(e1,e2);
                i1++;
                i2++;
                continue;
            }
            var newIndex = find(list1, i1, list2, i2);
            var numberDel = newIndex.i1 - i1;
            var insertList = list2.slice(i2, newIndex.i2);
            var spliceArguments = [i1, numberDel];
            spliceArguments.push.apply(spliceArguments, insertList);
            list1.splice.apply(list1, spliceArguments);
            if (newIndex.i2 < list1.length) {
                update(list1[newIndex.i2],list2[newIndex.i2]);
            }
            i1 = i2 = newIndex.i2 + 1;
        }

    };

    var check = function (l1, l2) {
        if (l1.length !== l2.length) {
            throw "length conflict " + l1.length + "!=" + l2.length;
        }
        for (var i = 0; i < l1.length; ++i) {
            var e1 = l1[i];
            var e2 = l2[i];
            if (e1 !== e2) {
                throw "element conflict at pos " + i + " " + e1 + "!=" + e2;
            }
        }
    };

    var upd = function (o) {
        console.log("upd:", o);
    };

    var test = function (l1, l2) {
        console.log(l1, l2);
        deltaSet(l1, l2, null, upd);
        check(l1, l2);
    };

    var tests = function () {

        test([1, 2, 3, 4], [1, 10, 20, 3, 4]);

        // insert
        test([1, 2, 3, 4], [1, 2, 10, 20, 3, 4]);
        test([1, 2], [1, 2, 10, 20]);


        // delete
        test([1, 2, 3, 4, 5], [1, 4, 5]);
        test([1, 2, 3], [1, 2]);

        // insert or delete
        test([1, 2, 3, 4, 5, 10, 20, 6, 7], [1, 2, 10, 20, 3, 4, 5, 6, 7]);

        // replace
        test([1, 2, 3, 5, 7], [1, 2, 4, 6, 10, 20, 7]);
        test([1, 2, 3, 5], [1, 2, 4, 6]);
        test([1, 2, 3, 5, 10], [1, 2, 4, 6]);
        test([1, 2, 3, 5], [1, 2, 4, 6, 10]);
        test([1, 2, 3, 5, 10, 20, 7], [1, 2, 4, 6, 7]);

        console.log("OK");

    };

    // =========================================================================
    //  main
    // =========================================================================

    //tests();

    return {
        deltaSet: deltaSet
    };

});