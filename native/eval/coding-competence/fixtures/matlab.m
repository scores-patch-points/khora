% AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
function a = area(r)
    a = 3.14159 * r * r;
end

function describe(r)
    fprintf('area=%f\n', area(r));
end

describe(2.0);
