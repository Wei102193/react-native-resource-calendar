// @flow
import * as React from 'react';
import {useMemo} from 'react';
import Row from "@/components/common/layout/Row";
import {Text} from "react-native";
import {TIME_LABEL_WIDTH} from "@/utilities/helpers";
import {StaffAvatar} from "@/components/ResourcesComponent";
import {CalendarMode, Resource} from "@/types/calendarTypes";
import {useCalendarBinding} from "@/store/bindings/BindingProvider";
import {useResolvedFont} from "@/theme/ThemeContext";
import Col from "@/components/common/layout/Col";
import {addDays, format, isSameDay} from "date-fns";
import Center from "@/components/common/layout/Center";

type Props = {
    onResourcePress?: (resource: Resource) => void;
    activeResourceId: number;
    date: Date;
    mode: CalendarMode;
    APPOINTMENT_BLOCK_WIDTH: number;
};
export const DaysComponent = ({onResourcePress, activeResourceId, mode, date, APPOINTMENT_BLOCK_WIDTH}: Props) => {
    const {useResourceById} =
        useCalendarBinding();
    const resource = useResourceById(activeResourceId);
    const titleFace = useResolvedFont({fontWeight: '700'});
    const subTitleFace = useResolvedFont({fontWeight: '600'});
    const isMultiDay = mode !== 'day';
    const visibleDayCount = isMultiDay ? (mode === 'week' ? 7 : 3) : 1;
    const days = useMemo(
        () => Array.from({length: visibleDayCount}, (_, i) => addDays(date, i)),
        [date, visibleDayCount]
    );

    return (
        <Row style={{paddingVertical: 4}}>
            <Col style={{width: TIME_LABEL_WIDTH, alignItems: "center", justifyContent: "center"}}>
                <StaffAvatar
                    onPress={() => {
                        if (onResourcePress)
                            onResourcePress(resource);
                    }}
                    name={resource?.name}
                    circleSize={TIME_LABEL_WIDTH - 12}
                    fontSize={16}
                    image={resource?.avatar}
                />
            </Col>
            <Row style={{flex: 1}}>
                {
                    days.map((d, i) => {
                        const selected = isSameDay(d, new Date());

                        return <Col
                            style={{
                                alignItems: "center",
                                justifyContent: "center",
                                width: APPOINTMENT_BLOCK_WIDTH,
                            }}
                            space={4}
                            key={d.toString()}>
                            <Center style={{
                                backgroundColor: selected ? "#4d959c" : undefined,
                                width: Math.min(30, APPOINTMENT_BLOCK_WIDTH - 8),
                                height: Math.min(30, APPOINTMENT_BLOCK_WIDTH - 8),
                                borderRadius: 999,
                            }}>
                                <Text style={{
                                    fontSize: 16,
                                    fontFamily: subTitleFace,
                                    fontWeight: '600',
                                    color: selected ? "#fff" : undefined,
                                }}
                                      numberOfLines={1}
                                      allowFontScaling={false}
                                >
                                    {format(d, "d")}
                                </Text>
                            </Center>
                            <Text style={{
                                fontSize: 14,
                                fontFamily: subTitleFace,
                                fontWeight: '600',
                            }}
                                  numberOfLines={1}
                                  allowFontScaling={false}
                            >
                                {format(d, "EEE")}
                            </Text>
                        </Col>
                    })
                }
            </Row>
        </Row>
    );
};
