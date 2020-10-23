import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { palette, typography } from 'app/styles';

import { RowTemplate } from './RowTemplate';

interface CardHeaderProps {
  title: string;
  isChoosen: boolean;
  onCardPress: (title: string) => void;
}

export const CardHeader = (props: CardHeaderProps) => {
  const { title, isChoosen, onCardPress } = props;

  const onPress = () => {
    onCardPress(title);
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={[styles.headerContainer, { borderBottomColor: isChoosen ? palette.textSecondary : palette.textGrey }]}
    >
      <Text style={styles.headerTitle}>{title}</Text>
    </TouchableOpacity>
  );
};

export interface Card {
  title: string;
  content: any;
}

interface Props {
  label: string;
  cards: Card[];
  onCardPressAction: (title: string) => void;
  activeTitle: string;
}

export const CardGroup = ({ label, cards, onCardPressAction, activeTitle }: Props) => {
  const isChoosen = (title: string) => activeTitle === title;

  const renderHeaders = () => (
    <View style={styles.cardsContainer}>
      <Text style={styles.headerLabel}>{label}</Text>
      <RowTemplate
        items={cards.map((card, index) => (
          <CardHeader
            key={index}
            title={card.title}
            isChoosen={isChoosen(card.title)}
            onCardPress={onCardPressAction}
          />
        ))}
      />
    </View>
  );

  const renderCardContent = () => {
    return cards.filter(card => isChoosen(card.title))[0]?.content;
  };

  return (
    <View>
      <View style={styles.headersContainer}>{renderHeaders()}</View>
      <View>{renderCardContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    ...typography.caption,
    textAlign: 'center',
  },
  headerContainer: {
    paddingBottom: 6.5,
    borderBottomWidth: 1,
  },
  cardsContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 250,
    alignSelf: 'center',
  },
  headersContainer: {
    marginBottom: 20,
  },
  headerLabel: {
    color: palette.textGrey,
    ...typography.subtitle4,
    marginBottom: 10,
  },
});
