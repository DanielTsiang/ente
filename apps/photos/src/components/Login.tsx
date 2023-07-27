import { useRouter } from 'next/router';
import { getSRPAttributes, sendOtt } from 'services/userService';
import { setData, LS_KEYS } from 'utils/storage/localStorage';
import { PAGES } from 'constants/pages';
import FormPaperTitle from './Form/FormPaper/Title';
import FormPaperFooter from './Form/FormPaper/Footer';
import LinkButton from './pages/gallery/LinkButton';
import { t } from 'i18next';
import { setUserSRPSetupPending } from 'utils/storage';
import { addLocalLog } from 'utils/logging';
import { Input } from '@mui/material';
import SingleInputForm, { SingleInputFormProps } from './SingleInputForm';

interface LoginProps {
    signUp: () => void;
}

export default function Login(props: LoginProps) {
    const router = useRouter();

    const loginUser: SingleInputFormProps['callback'] = async (
        email,
        setFieldError
    ) => {
        try {
            const srpAttributes = await getSRPAttributes(email);
            addLocalLog(
                () => ` srpAttributes: ${JSON.stringify(srpAttributes)}`
            );
            if (!srpAttributes) {
                setUserSRPSetupPending(true);
                await sendOtt(email);
                setData(LS_KEYS.USER, { email });
                router.push(PAGES.VERIFY);
            } else {
                setUserSRPSetupPending(false);
                setData(LS_KEYS.SRP_ATTRIBUTES, srpAttributes);
                router.push(PAGES.CREDENTIALS);
            }
        } catch (e) {
            setFieldError(`${t('UNKNOWN_ERROR} ${e.message}')}`);
        }
    };

    return (
        <>
            <FormPaperTitle>{t('LOGIN')}</FormPaperTitle>
            <SingleInputForm
                callback={loginUser}
                fieldType="email"
                placeholder={t('ENTER_EMAIL')}
                buttonText={t('LOGIN')}
                autoComplete="username"
                hiddenPostInput={<Input hidden type="password" value="" />}
            />

            <FormPaperFooter>
                <LinkButton onClick={props.signUp}>
                    {t('NO_ACCOUNT')}
                </LinkButton>
            </FormPaperFooter>
        </>
    );
}
