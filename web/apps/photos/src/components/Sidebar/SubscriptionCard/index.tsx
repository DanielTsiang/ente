import type { ButtonishProps } from "@/new/photos/components/mui";
import { bytesInGB, formattedStorageByteSize } from "@/new/photos/utils/units";
import {
    FlexWrapper,
    Overlay,
    SpaceBetweenFlex,
} from "@ente/shared/components/Container";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, Skeleton, Stack, Typography, styled } from "@mui/material";
import { t } from "i18next";
import type React from "react";
import { useMemo } from "react";
import type { UserDetails } from "types/user";
import { hasNonAdminFamilyMembers, isPartOfFamily } from "utils/user/family";
import { LegendIndicator, Progressbar } from "./styledComponents";

interface SubscriptionCardProps {
    userDetails: UserDetails;
    onClick: () => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
    userDetails,
    onClick,
}) => {
    if (!userDetails) {
        return (
            <Skeleton
                animation="wave"
                variant="rectangular"
                height={152}
                sx={{ borderRadius: "8px" }}
            />
        );
    }

    return (
        <Box position="relative">
            <BackgroundOverlay />
            <SubscriptionCardContentOverlay userDetails={userDetails} />
            <ClickOverlay onClick={onClick} />
        </Box>
    );
};

const BackgroundOverlay: React.FC = () => {
    return (
        <img
            style={{ aspectRatio: "2/1" }}
            width="100%"
            src="/images/subscription-card-background/1x.png"
            srcSet="/images/subscription-card-background/2x.png 2x,
                        /images/subscription-card-background/3x.png 3x"
        />
    );
};

const ClickOverlay: React.FC<ButtonishProps> = ({ onClick }) => {
    return (
        <Overlay display="flex">
            <FlexWrapper
                onClick={onClick}
                justifyContent={"flex-end"}
                sx={{ cursor: "pointer" }}
            >
                <ChevronRightIcon />
            </FlexWrapper>
        </Overlay>
    );
};

interface SubscriptionCardContentOverlayProps {
    userDetails: UserDetails;
}

export const SubscriptionCardContentOverlay: React.FC<
    SubscriptionCardContentOverlayProps
> = ({ userDetails }) => {
    return (
        <Overlay>
            <SpaceBetweenFlex
                height={"100%"}
                flexDirection={"column"}
                padding={"20px 16px"}
            >
                {hasNonAdminFamilyMembers(userDetails.familyData) ? (
                    <FamilySubscriptionCardContent userDetails={userDetails} />
                ) : (
                    <IndividualSubscriptionCardContent
                        userDetails={userDetails}
                    />
                )}
            </SpaceBetweenFlex>
        </Overlay>
    );
};

interface IndividualSubscriptionCardContentProps {
    userDetails: UserDetails;
}

const IndividualSubscriptionCardContent: React.FC<
    IndividualSubscriptionCardContentProps
> = ({ userDetails }) => {
    const totalStorage =
        userDetails.subscription.storage + (userDetails.storageBonus ?? 0);
    return (
        <>
            <StorageSection storage={totalStorage} usage={userDetails.usage} />
            <IndividualUsageSection
                usage={userDetails.usage}
                fileCount={userDetails.fileCount}
                storage={totalStorage}
            />
        </>
    );
};

const MobileSmallBox = styled(Box)`
    display: none;
    @media (max-width: 359px) {
        display: block;
    }
`;

const DefaultBox = styled(Box)`
    display: none;
    @media (min-width: 360px) {
        display: block;
    }
`;

interface StorageSectionProps {
    usage: number;
    storage: number;
}

const StorageSection: React.FC<StorageSectionProps> = ({ usage, storage }) => {
    return (
        <Box width="100%">
            <Typography variant="small" color={"text.muted"}>
                {t("STORAGE")}
            </Typography>
            <DefaultBox>
                <Typography
                    fontWeight={"bold"}
                    sx={{ fontSize: "24px", lineHeight: "30px" }}
                >
                    {`${formattedStorageByteSize(usage, { round: true })} ${t(
                        "OF",
                    )} ${formattedStorageByteSize(storage)} ${t("USED")}`}
                </Typography>
            </DefaultBox>
            <MobileSmallBox>
                <Typography
                    fontWeight={"bold"}
                    sx={{ fontSize: "24px", lineHeight: "30px" }}
                >
                    {`${bytesInGB(usage)} /  ${bytesInGB(storage)} ${t("storage_unit.gb")} ${t("USED")}`}
                </Typography>
            </MobileSmallBox>
        </Box>
    );
};

interface IndividualUsageSectionProps {
    usage: number;
    fileCount: number;
    storage: number;
}

const IndividualUsageSection: React.FC<IndividualUsageSectionProps> = ({
    usage,
    storage,
    fileCount,
}) => {
    // [Note: Fallback translation for languages with multiple plurals]
    //
    // Languages like Polish and Arabian have multiple plural forms, and
    // currently i18n falls back to the base language translation instead of the
    // "_other" form if all the plural forms are not listed out.
    //
    // As a workaround, name the _other form as the unprefixed name. That is,
    // instead of calling the most general plural form as foo_count_other, call
    // it foo_count (To keep our heads straight, we adopt the convention that
    // all such pluralizable strings use the _count suffix, but that's not a
    // requirement from the library).
    return (
        <Box width="100%">
            <Progressbar value={Math.min((usage * 100) / storage, 100)} />
            <SpaceBetweenFlex
                sx={{
                    marginTop: 1.5,
                }}
            >
                <Typography variant="mini">{`${formattedStorageByteSize(
                    storage - usage,
                )} ${t("FREE")}`}</Typography>
                <Typography variant="mini" fontWeight={"bold"}>
                    {t("photos_count", { count: fileCount ?? 0 })}
                </Typography>
            </SpaceBetweenFlex>
        </Box>
    );
};

interface FamilySubscriptionCardContentProps {
    userDetails: UserDetails;
}

const FamilySubscriptionCardContent: React.FC<
    FamilySubscriptionCardContentProps
> = ({ userDetails }) => {
    const totalUsage = useMemo(() => {
        if (isPartOfFamily(userDetails.familyData)) {
            return userDetails.familyData.members.reduce(
                (sum, currentMember) => sum + currentMember.usage,
                0,
            );
        } else {
            return userDetails.usage;
        }
    }, [userDetails]);
    const totalStorage =
        userDetails.familyData.storage + (userDetails.storageBonus ?? 0);

    return (
        <>
            <StorageSection storage={totalStorage} usage={totalUsage} />
            <FamilyUsageSection
                userUsage={userDetails.usage}
                fileCount={userDetails.fileCount}
                totalUsage={totalUsage}
                totalStorage={totalStorage}
            />
        </>
    );
};

interface FamilyUsageSectionProps {
    userUsage: number;
    totalUsage: number;
    fileCount: number;
    totalStorage: number;
}

const FamilyUsageSection: React.FC<FamilyUsageSectionProps> = ({
    userUsage,
    totalUsage,
    fileCount,
    totalStorage,
}) => {
    return (
        <Box width="100%">
            <FamilyUsageProgressBar
                totalUsage={totalUsage}
                userUsage={userUsage}
                totalStorage={totalStorage}
            />
            <SpaceBetweenFlex
                sx={{
                    marginTop: 1.5,
                }}
            >
                <Stack direction={"row"} spacing={1.5}>
                    <Legend label={t("YOU")} color="text.base" />
                    <Legend label={t("FAMILY")} color="text.muted" />
                </Stack>
                <Typography variant="mini" fontWeight={"bold"}>
                    {t("photos_count", { count: fileCount ?? 0 })}
                </Typography>
            </SpaceBetweenFlex>
        </Box>
    );
};

interface FamilyUsageProgressBarProps {
    userUsage: number;
    totalUsage: number;
    totalStorage: number;
}

const FamilyUsageProgressBar: React.FC<FamilyUsageProgressBarProps> = ({
    userUsage,
    totalUsage,
    totalStorage,
}) => {
    return (
        <Box position={"relative"} width="100%">
            <Progressbar
                sx={{ backgroundColor: "transparent" }}
                value={Math.min((userUsage * 100) / totalStorage, 100)}
            />
            <Progressbar
                sx={{
                    position: "absolute",
                    top: 0,
                    zIndex: 1,
                    ".MuiLinearProgress-bar ": {
                        backgroundColor: "text.muted",
                    },
                    width: "100%",
                }}
                value={Math.min((totalUsage * 100) / totalStorage, 100)}
            />
        </Box>
    );
};

interface LegendProps {
    label: string;
    color: string;
}

const Legend: React.FC<LegendProps> = ({ label, color }) => {
    return (
        <FlexWrapper>
            <LegendIndicator sx={{ color }} />
            <Typography variant="mini" fontWeight={"bold"}>
                {label}
            </Typography>
        </FlexWrapper>
    );
};
