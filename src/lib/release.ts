export interface ReleaseNote {
  version: string;
  date: string;
  message: string;
}

// 현재 사용자에게 노출할 업데이트 로그 버전
export const CURRENT_RELEASE_VERSION = "1.0.1";

// 릴리즈 로그 템플릿
export const RELEASE_NOTES: Record<string, ReleaseNote> = {
  "1.0.0": {
    version: "1.0.0",
    date: "",
    message: "",
  },
  "1.0.1": {
    version: "1.0.1",
    date: "2026-03-18",
    message: `대표병 카톡 생성기가 업데이트되었습니다! 이번 업데이트에서는 설문 조사 결과를 적극 반영하여 여러 가지 개선 사항이 적용되었습니다.

* 출타 일정 관리 개선

이제 출타날이 되면, 자동으로 열외 사유가 '휴가/외출/외박'으로 변경됩니다!
더 이상 일일이 열외 사유를 바꿀 필요가 없어졌습니다.


* 인수인계 기능에 대한 설명 추가

인수인계 기능은 새로운 사용자가 기존 사용자의 데이터를 쉽게 가져올 수 있도록 도와주는 기능입니다.
이번 업데이트에서는 이 기능에 대한 자세한 설명이 추가되어, 사용자가 어떻게 데이터를 이전할 수 있는지 명확하게 안내합니다.


* 사용자 인터페이스 개선

이제 인원을 선택할 때 드래그로 여러 인원을 선택할 수 있습니다! 조작이 더 편해진 셈이죠.


* 버그 수정

날짜가 지난 배달음식 주문이 계속 표시되는 문제를 해결했습니다. 이제 지난 주문은 자동으로 숨겨집니다.`,
  },
};

export function getCurrentReleaseNote(): ReleaseNote {
  return (
    RELEASE_NOTES[CURRENT_RELEASE_VERSION] ?? {
      version: CURRENT_RELEASE_VERSION,
      date: "",
      message: "",
    }
  );
}

export function getUpdateLogDismissKey(version: string): string {
  return `dk-update-log-dismissed-${version}`;
}
