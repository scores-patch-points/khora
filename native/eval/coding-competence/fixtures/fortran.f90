! AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
module shapes
  implicit none
  type :: shape
    real :: r
  end type shape
  type, extends(shape) :: circle
  end type circle
contains
  function area(c) result(a)
    type(shape), intent(in) :: c
    real :: a
    a = 3.14159 * c%r * c%r
  end function area

  subroutine describe(c)
    type(shape), intent(in) :: c
    print *, area(c)
  end subroutine describe
end module shapes

program main
  use shapes
  type(shape) :: s
  s%r = 2.0
  call describe(s)
end program main
