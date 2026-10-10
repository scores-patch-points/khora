% AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
classdef Circle < Shape
    properties
        r
    end
    methods
        function obj = Circle(r)
            obj.r = r;
        end
        function a = area(obj)
            a = 3.14159 * obj.r * obj.r;
        end
    end
end
