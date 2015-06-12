angular.module('queup.in_session', [])

.controller('In_sessionController', function($rootScope, $scope, teacherData, $state){
  $scope.currentClassname = teacherData.get('currentClass').name;

  $scope.classes = teacherData.get('classes');

  $scope.numberOfClasses = $scope.classes.length;

  // console.log("inherited data in in session: ", $state)
  // console.log("inherited queueLength data in in session: ", $state.current.data.data1)
  
  $rootScope.qLength = 0;
  $scope.numberOfQuestions = $rootScope.qLength;

  $scope.studentsInClass = 0

  for(var i = 0; i < $scope.classes.length; i++) {
    if($scope.classes[i].name === $scope.currentClassname) {
      $scope.studentsInClass += $scope.classes[i].students.length
    }
  }
});
