// minimal index.js proxy helper
window.SITE_CONFIG = window.SITE_CONFIG || { title: 'Impact in Business Recruitment', contactEmail: 'uk-hr-enquiries@ibrecruitment.com' };

document.addEventListener('DOMContentLoaded', function(){
  var loginEls = document.querySelectorAll('.nav-login, a[href="/login.html"]');
  loginEls.forEach(function(el){ el.addEventListener('click', function(){}); });
});
