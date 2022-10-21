const { environment } = require("../constants");
const { developerEmails, developerGmails } = require("../DataLists/emails");

const showUpdateAlert = ` 
  try{
    const newVersionNotReadyText =
      'App version is outdated. Please, get a new version. If experiencing problems, manually reinstall the app.';

    const greyUserDialog = (text, action = () => {}) => {
      setInterval(() => {
        try {
          context.greyUserDialogProps.current.push({
            title: '👋 Alert!',
            text: text,
            actionButtonName: 'Okay',
            actionButton: action,
            showCloseButton: false,
          });
          if (context.greyUserDialog) {
            context.greyUserDialog.current = { opened: true };
          }
          if (context.greyUserDialogVisibility) {
            context.greyUserDialogVisibility.setValue(1);
          }
          if (context.setRefreshGreyUserDialog) {
            context.setRefreshGreyUserDialog(new Date().getTime());
          }
          if (context.setShowGreyUserDialog) {
            context.setShowGreyUserDialog(true);
          }
        } catch (error) {
          console.log('Error fya7f ', error);
        }
      }, 2000);
    };

    const oldAlert = (text, action = () => {}) => {
      context.userDialogQuestion.current = text;
      context.leftButtonText.current = 'Update';
      context.leftButtonAction.current = action;
      context.rightButtonText.current = 'Cancel';
      context.setShowUserDialog(true);
    };

    const openStore = () => {
      if (Platform.OS == 'android') {
        expoLinking
          .openURL('market://details?id=com.test.novelty')
          .catch((error) => {
            console.log('Error aosidhya767', error);
          });
      } else if (Platform.OS == 'ios') {
        expoLinking
          .openURL(
            'itms-apps://apps.apple.com/id/app/novelty.today/id1563260378?l=id',
          )
          .catch((error) => {
            console.log('Error aosidhya767', error);
          });
      }
    };

    const isDeveloper = (emailEnding ) => {  
      return ${JSON.stringify(
        developerEmails
      )}.includes("@"+context.authorizationInfo?.email?.split("@")[1]) || 
        ${JSON.stringify(
          developerGmails
        )}.includes(context.authorizationInfo?.email)
    } 

    if (Platform.OS == 'android') {
      if (
        '1.5.1' == Constants.nativeAppVersion ||
        '1.5.21' == Constants.nativeAppVersion
      ) { 
        greyUserDialog(newVersionNotReadyText);
      } else {
        oldAlert(newVersionNotReadyText);
      }
    } else {
      // dont show anything for current version 
      if( (!isDeveloper() && '${environment}'== 'debug' )  || ( !['2.11', '2.12', '2.13', '2.14', '2.15'].includes(Constants.nativeBuildVersion) )){
        if (
          ['1.5.1','1.5.2', '1.5.4', '1.5.5', '1.5.6', '1.5.7'].includes(Constants.nativeAppVersion) 
        ) {
          greyUserDialog(newVersionNotReadyText, openStore);
        } else {
          oldAlert(newVersionNotReadyText, openStore);
        }
      }
    }
  } catch (error) {
    console.log('error euaf ', error);
  }
`;

const showLocalTaskFinishAlert = (
  localTaskKey,
  alertText,
  isSuccess,
  picture = null,
  microPicture = null
) => `
    try{      

      delete context.tasks.current["${localTaskKey}"];

      if(${picture ? false : true}) context.setEndProgressIndicator(true);

      setTimeout(() => { 
        try{
          if(${picture ? false : true})
          {
            context.setShowProgressIndicator(false); 

            if(${isSuccess}){   
              showGreyUserDialog(context, {
                title: 'Great!',
                text: '${alertText}',
                actionButtonName: 'Okay',
                actionButtonColor: 'light',
                showCloseButton: false,
              }); 
            }else{  
              showGreyUserDialog(context, {
                title: 'Fail!',
                text: '${alertText}',  
                actionButtonName: 'Okay',
                actionButtonColor: 'light',   
                showCloseButton: false,
              });  
            
            } 
          }
            if(${picture ? true : false} && context.userInfo){
            context.setUserInfo(prev=>{return {...prev, picture: "${picture}", microPicture: "${microPicture}"}})
          } 
        }catch(error){
          console.log('Error fau87 ', error)
      }
      }, 1000);
    }catch(error){
        console.log('Error aifdfdfdu9868%&*  ', error)
    }
`;

module.exports = {
  showUpdateAlert,
  showLocalTaskFinishAlert,
};
